import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { Redis } from '@upstash/redis';
import { createServiceClient } from '@/lib/supabase-server';

const BOT_TOKEN       = process.env.TELEGRAM_BOT_TOKEN!;
const WEBHOOK_SECRET  = process.env.TELEGRAM_WEBHOOK_SECRET!;
const MERCHANT_WALLET = process.env.TON_WALLET_ADDRESS!;

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'en' | 'ru';
type Plan = 'monthly' | 'yearly' | 'lifetime';

// ─── Language (Redis) ─────────────────────────────────────────────────────────

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

async function getLang(chatId: number): Promise<Lang> {
  try {
    const r = getRedis();
    if (!r) return 'en';
    const v = await r.get<string>(`bot_lang:${chatId}`);
    return v === 'ru' ? 'ru' : 'en';
  } catch { return 'en'; }
}

async function setLang(chatId: number, lang: Lang): Promise<void> {
  try {
    const r = getRedis();
    if (r) await r.set(`bot_lang:${chatId}`, lang, { ex: 31_536_000 });
  } catch { /* ignore */ }
}

// ─── Plan config ──────────────────────────────────────────────────────────────

const PLANS = {
  monthly:  { stars: 249,  payload: 'pro_monthly',  usd: 2.99,  days: 30  },
  yearly:   { stars: 1799, payload: 'pro_yearly',   usd: 19.99, days: 365 },
  lifetime: { stars: 2999, payload: 'pro_lifetime', usd: 34.99, days: 0   },
} as const;

const PLAN_LABEL: Record<Plan, Record<Lang, string>> = {
  monthly:  { en: 'Monthly',       ru: 'Месяц'    },
  yearly:   { en: 'Yearly −40%',   ru: 'Год −40%' },
  lifetime: { en: 'Lifetime',      ru: 'Навсегда' },
};

const PLAN_DURATION: Record<Plan, Record<Lang, string>> = {
  monthly:  { en: '30 days',   ru: '30 дней'      },
  yearly:   { en: '365 days',  ru: '365 дней'     },
  lifetime: { en: 'Forever ♾', ru: 'Навсегда ♾'  },
};

const VALID_PLANS = new Set(['pro_monthly', 'pro_yearly', 'pro_lifetime']);

// ─── Telegram API ─────────────────────────────────────────────────────────────

async function tg(method: string, body: object) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

function send(chatId: number, text: string, extra: object = {}) {
  return tg('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra });
}

function edit(chatId: number, msgId: number, text: string, extra: object = {}) {
  return tg('editMessageText', { chat_id: chatId, message_id: msgId, text, parse_mode: 'HTML', ...extra });
}

function answerCB(id: string, text?: string, alert = false) {
  return tg('answerCallbackQuery', { callback_query_id: id, text, show_alert: alert });
}

function answerPreCheckout(queryId: string, ok: boolean, errorMessage?: string) {
  return tg('answerPreCheckoutQuery', {
    pre_checkout_query_id: queryId,
    ok,
    ...(ok ? {} : { error_message: errorMessage ?? 'Invalid request' }),
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcProUntil(payload: string, currentProUntil: string | null): string | null {
  if (payload === 'pro_lifetime') return null;
  const now  = new Date();
  const base = currentProUntil && new Date(currentProUntil) > now
    ? new Date(currentProUntil) : now;
  if (payload === 'pro_monthly') base.setDate(base.getDate() + 30);
  if (payload === 'pro_yearly')  base.setDate(base.getDate() + 365);
  return base.toISOString();
}

async function getTonPrice(): Promise<number> {
  try {
    const r = await fetch('https://tonapi.io/v2/rates?tokens=ton&currencies=usd');
    const d = await r.json();
    const p = d?.rates?.TON?.prices?.USD;
    return typeof p === 'number' && p > 0 ? p : 4.0;
  } catch { return 4.0; }
}

const APP_URL = 'https://www.subeasy.org';

// ─── Keyboard builders ────────────────────────────────────────────────────────

function kbOpen(lang: Lang) {
  return { text: lang === 'en' ? '🚀 Open SubEasy' : '🚀 Открыть SubEasy', web_app: { url: APP_URL } };
}

function proKeyboard(lang: Lang) {
  return {
    inline_keyboard: [
      [
        { text: `${lang === 'en' ? 'Month' : 'Месяц'} · 249 ⭐`,        callback_data: 'plan:monthly'  },
        { text: `${lang === 'en' ? 'Year −40%' : 'Год −40%'} · 1799 ⭐`, callback_data: 'plan:yearly'   },
        { text: `${lang === 'en' ? 'Forever' : 'Навсегда'} · 2999 ⭐`,   callback_data: 'plan:lifetime' },
      ],
    ],
  };
}

function planKeyboard(plan: Plan, lang: Lang) {
  const cfg = PLANS[plan];
  return {
    inline_keyboard: [
      [{ text: `⭐ ${lang === 'en' ? 'Pay with Stars' : 'Оплатить Stars'} · ${cfg.stars} ⭐`, callback_data: `stars:${plan}` }],
      [{ text: `💎 ${lang === 'en' ? 'Pay with TON' : 'Оплатить TON'} · ≈$${cfg.usd}`,        callback_data: `ton:${plan}`   }],
      [{ text: lang === 'en' ? '← Back' : '← Назад', callback_data: 'pro' }],
    ],
  };
}

// ─── Command: /start ──────────────────────────────────────────────────────────

async function cmdStart(chatId: number, lang: Lang) {
  const text = lang === 'en'
    ? '👋 <b>Welcome to SubEasy!</b>\n\nTrack all your subscriptions in one place — never miss a renewal.\n\n💡 Add subscriptions, set budgets, get reminders before charges.'
    : '👋 <b>Добро пожаловать в SubEasy!</b>\n\nВсе подписки в одном месте — никогда не пропустите списание.\n\n💡 Добавляйте подписки, устанавливайте бюджеты, получайте напоминания.';

  await send(chatId, text, {
    reply_markup: {
      inline_keyboard: [[
        kbOpen(lang),
        { text: lang === 'en' ? '👑 Get PRO' : '👑 Получить PRO', callback_data: 'pro' },
      ]],
    },
  });
}

// ─── Command: /pro (also used as callback) ────────────────────────────────────

async function cmdPro(chatId: number, lang: Lang, editMsgId?: number) {
  const text = lang === 'en'
    ? '👑 <b>SubEasy PRO</b>\n\nUnlock everything:\n📊 Budget control &amp; alerts\n👨‍👩‍👧 Family Plan — up to 6 people\n🔔 Smart Telegram reminders\n📄 PDF / CSV export\n🤖 AI audit — <i>coming soon</i>\n\n<b>Choose a plan:</b>'
    : '👑 <b>SubEasy PRO</b>\n\nОткрой всё:\n📊 Бюджетный контроль и алерты\n👨‍👩‍👧 Семейный план — до 6 человек\n🔔 Умные Telegram-уведомления\n📄 PDF / CSV экспорт\n🤖 AI аудит — <i>скоро</i>\n\n<b>Выбери план:</b>';

  const kb = proKeyboard(lang);
  if (editMsgId) {
    await edit(chatId, editMsgId, text, { reply_markup: kb });
  } else {
    await send(chatId, text, { reply_markup: kb });
  }
}

// ─── Command: /status ─────────────────────────────────────────────────────────

async function cmdStatus(chatId: number, telegramId: number, lang: Lang) {
  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_pro, pro_until')
    .eq('telegram_chat_id', telegramId)
    .maybeSingle();

  if (!profile) {
    const text = lang === 'en'
      ? '❌ <b>Account not linked</b>\n\nOpen SubEasy to link your Telegram account first.'
      : '❌ <b>Аккаунт не привязан</b>\n\nОткройте SubEasy, чтобы привязать Telegram-аккаунт.';
    await send(chatId, text, { reply_markup: { inline_keyboard: [[kbOpen(lang)]] } });
    return;
  }

  let statusLine: string;
  if (profile.is_pro) {
    if (!profile.pro_until) {
      statusLine = lang === 'en' ? '👑 PRO · Lifetime ♾' : '👑 PRO · Навсегда ♾';
    } else {
      const d   = new Date(profile.pro_until);
      const fmt = d.toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
      statusLine = lang === 'en' ? `👑 PRO · until ${fmt}` : `👑 PRO · до ${fmt}`;
    }
  } else {
    statusLine = lang === 'en' ? '🔓 Free plan' : '🔓 Бесплатный план';
  }

  const text = lang === 'en'
    ? `📊 <b>Your SubEasy Account</b>\n\nStatus: ${statusLine}`
    : `📊 <b>Ваш аккаунт SubEasy</b>\n\nСтатус: ${statusLine}`;

  await send(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [kbOpen(lang)],
        ...(!profile.is_pro ? [[{ text: lang === 'en' ? '👑 Upgrade to PRO' : '👑 Перейти на PRO', callback_data: 'pro' }]] : []),
      ],
    },
  });
}

// ─── Command: /language ───────────────────────────────────────────────────────

async function cmdLanguage(chatId: number, lang: Lang) {
  const text = '🌐 <b>Language / Язык</b>';
  await send(chatId, text, {
    reply_markup: {
      inline_keyboard: [[
        { text: `🇬🇧 English${lang === 'en' ? ' ✓' : ''}`, callback_data: 'lang:en' },
        { text: `🇷🇺 Русский${lang === 'ru' ? ' ✓' : ''}`, callback_data: 'lang:ru' },
      ]],
    },
  });
}

// ─── Command: /help ───────────────────────────────────────────────────────────

async function cmdHelp(chatId: number, lang: Lang) {
  const text = lang === 'en'
    ? '❓ <b>SubEasy Bot</b>\n\n<b>Commands:</b>\n/start — Open SubEasy\n/pro — Get PRO access\n/status — Your account status\n/language — Switch language\n/support — Contact support\n/delete_data — Delete my data'
    : '❓ <b>Бот SubEasy</b>\n\n<b>Команды:</b>\n/start — Открыть SubEasy\n/pro — Получить PRO\n/status — Статус аккаунта\n/language — Сменить язык\n/support — Поддержка\n/delete_data — Удалить данные';

  await send(chatId, text, { reply_markup: { inline_keyboard: [[kbOpen(lang)]] } });
}

// ─── Command: /support ────────────────────────────────────────────────────────

async function cmdSupport(chatId: number, lang: Lang) {
  const text = lang === 'en'
    ? '💬 <b>SubEasy Support</b>\n\nHave a question or issue? Contact us: @by_arto\nWe reply within 24 hours.'
    : '💬 <b>Поддержка SubEasy</b>\n\nЕсть вопрос или проблема? Напишите: @by_arto\nОтвечаем в течение 24 часов.';
  await send(chatId, text);
}

// ─── Command: /delete_data ────────────────────────────────────────────────────

async function cmdDeleteData(chatId: number, lang: Lang) {
  const text = lang === 'en'
    ? '🗑 <b>Delete Account &amp; Data</b>\n\nTo delete all your SubEasy data:\n1. Open SubEasy\n2. Settings → Account → "Delete account &amp; data"\n\nOr contact @by_arto — we delete manually within 24 hours.\n\n<i>Rights protected under GDPR: subeasy.org/privacy</i>'
    : '🗑 <b>Удаление аккаунта и данных</b>\n\nЧтобы удалить данные:\n1. Откройте SubEasy\n2. Настройки → Аккаунт → «Удалить аккаунт и данные»\n\nИли напишите @by_arto — удалим вручную в течение 24 часов.\n\n<i>Права защищены по GDPR: subeasy.org/privacy</i>';
  await send(chatId, text);
}

// ─── Callback: plan selection → payment method ────────────────────────────────

async function cbPlan(chatId: number, msgId: number, plan: Plan, lang: Lang) {
  const cfg  = PLANS[plan];
  const label = PLAN_LABEL[plan][lang];
  const dur   = PLAN_DURATION[plan][lang];
  const text  = lang === 'en'
    ? `👑 <b>PRO · ${label}</b>\n\n${dur} of full PRO access\n\n<b>Choose payment method:</b>`
    : `👑 <b>PRO · ${label}</b>\n\n${dur} полного PRO-доступа\n\n<b>Выбери способ оплаты:</b>`;
  void cfg;
  await edit(chatId, msgId, text, { reply_markup: planKeyboard(plan, lang) });
}

// ─── Callback: Stars payment ──────────────────────────────────────────────────

async function cbStars(chatId: number, plan: Plan, lang: Lang) {
  const cfg   = PLANS[plan];
  const label = PLAN_LABEL[plan][lang];
  const dur   = PLAN_DURATION[plan][lang];

  await tg('sendInvoice', {
    chat_id:     chatId,
    title:       lang === 'en' ? `SubEasy PRO · ${label}` : `SubEasy PRO · ${PLAN_LABEL[plan].ru}`,
    description: lang === 'en' ? `${dur} of full PRO access` : `${PLAN_DURATION[plan].ru} полного PRO-доступа`,
    payload:     cfg.payload,
    currency:    'XTR',
    prices:      [{ label: `PRO · ${label}`, amount: cfg.stars }],
  });
}

// ─── Callback: TON payment ────────────────────────────────────────────────────

async function cbTon(chatId: number, telegramId: number, plan: Plan, lang: Lang) {
  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('telegram_chat_id', telegramId)
    .maybeSingle();

  if (!profile) {
    await send(chatId,
      lang === 'en'
        ? '❌ Account not linked. Open SubEasy first to link your Telegram account.'
        : '❌ Аккаунт не привязан. Сначала откройте SubEasy.',
      { reply_markup: { inline_keyboard: [[kbOpen(lang)]] } },
    );
    return;
  }

  const tonPrice  = await getTonPrice();
  const cfg       = PLANS[plan];
  const tonAmount = Math.ceil((cfg.usd * 1.02) / tonPrice * 100) / 100;
  const nanoAmount = Math.round(tonAmount * 1e9);
  const memo      = `sub-${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;

  await supabase.from('ton_payments').insert({
    user_id:     profile.id,
    plan,
    amount_ton:  tonAmount,
    amount_nano: nanoAmount,
    memo,
    status:      'pending',
  });

  const tonkeeperUrl = `https://app.tonkeeper.com/transfer/${MERCHANT_WALLET}?amount=${nanoAmount}&text=${encodeURIComponent(memo)}`;
  const label = PLAN_LABEL[plan][lang];

  const text = lang === 'en'
    ? `💎 <b>TON Payment · PRO ${label}</b>\n\n` +
      `Send <b>exactly ${tonAmount} TON</b> to:\n<code>${MERCHANT_WALLET}</code>\n\n` +
      `<b>⚠️ Comment (REQUIRED):</b>\n<code>${memo}</code>\n\n` +
      `Without the comment your payment cannot be confirmed!\n\n` +
      `⏱ Valid for 30 minutes`
    : `💎 <b>Оплата TON · PRO ${label}</b>\n\n` +
      `Отправьте <b>ровно ${tonAmount} TON</b> на адрес:\n<code>${MERCHANT_WALLET}</code>\n\n` +
      `<b>⚠️ Комментарий (ОБЯЗАТЕЛЬНО):</b>\n<code>${memo}</code>\n\n` +
      `Без комментария платёж не будет подтверждён!\n\n` +
      `⏱ Действует 30 минут`;

  await send(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📱 Tonkeeper', url: tonkeeperUrl }],
        [{ text: lang === 'en' ? "✅ I've sent it! Check" : '✅ Отправил! Проверить', callback_data: `check_ton:${memo}` }],
      ],
    },
  });
}

// ─── Callback: check TON payment ─────────────────────────────────────────────

async function cbCheckTon(chatId: number, memo: string, cbId: string, lang: Lang) {
  const supabase = createServiceClient();
  const { data: payment } = await supabase
    .from('ton_payments')
    .select('status')
    .eq('memo', memo)
    .maybeSingle();

  if (!payment) {
    await answerCB(cbId, lang === 'en' ? 'Payment not found. Create a new one.' : 'Платёж не найден. Создайте новый.', true);
    return;
  }

  if (payment.status === 'paid') {
    await answerCB(cbId, lang === 'en' ? '✅ Payment confirmed!' : '✅ Оплата подтверждена!', true);
    await send(chatId,
      lang === 'en'
        ? '✅ <b>SubEasy PRO activated!</b>\n\n💎 Paid via TON\n\nAll features are now available 🚀'
        : '✅ <b>SubEasy PRO активирован!</b>\n\n💎 Оплата через TON\n\nВсе функции уже доступны 🚀',
      { reply_markup: { inline_keyboard: [[kbOpen(lang)]] } },
    );
    return;
  }

  await answerCB(cbId,
    lang === 'en'
      ? '⏳ Not confirmed yet. TON takes 5–30 sec. Try again in a moment.'
      : '⏳ Ещё не подтверждено. TON занимает 5–30 сек. Попробуйте через момент.',
    true,
  );
}

// ─── Stars payment success ────────────────────────────────────────────────────

async function handleStarsPayment(update: Record<string, unknown>, lang: Lang) {
  const payment        = update.message as Record<string, unknown>;
  const paymentData    = payment.successful_payment as Record<string, unknown>;
  const telegramUserId = (payment.from as Record<string, unknown>).id as number;
  const chatId         = (payment.chat as Record<string, unknown>).id as number;
  const payload        = paymentData.invoice_payload as string;

  if (!VALID_PLANS.has(payload)) {
    console.error('[webhook/payment] unknown payload:', payload);
    return;
  }

  const supabase = createServiceClient();
  const { data: profile, error: lookupError } = await supabase
    .from('profiles')
    .select('id, pro_until')
    .eq('telegram_chat_id', telegramUserId)
    .maybeSingle();

  if (lookupError) console.error('[webhook/payment] lookup error:', lookupError.message);

  if (!profile) {
    await send(chatId, lang === 'en'
      ? '❌ <b>Account not found.</b>\n\nOpen SubEasy to link your account, then contact support.'
      : '❌ <b>Аккаунт не найден.</b>\n\nОткройте SubEasy, привяжите аккаунт и обратитесь в поддержку.',
    );
    return;
  }

  const proUntil = calcProUntil(payload, profile.pro_until ?? null);
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ is_pro: true, pro_until: proUntil, last_stars_charge_id: paymentData.telegram_payment_charge_id })
    .eq('id', profile.id);

  if (updateError) {
    console.error('[webhook/payment] update error:', updateError.message);
    await send(chatId, lang === 'en'
      ? '⚠️ Payment received but activation failed. Contact @by_arto — we will fix it.'
      : '⚠️ Оплата получена, но ошибка активации. Напишите @by_arto — всё решим.',
    );
    return;
  }

  // Log affiliate conversion
  const msg = update.message as Record<string, unknown>;
  const affiliateInfo = msg?.affiliate_info as Record<string, unknown> | undefined;
  if (affiliateInfo?.affiliate_user) {
    const aUser = affiliateInfo.affiliate_user as Record<string, unknown>;
    await supabase.from('affiliate_conversions').insert({
      buyer_telegram_id:     telegramUserId,
      buyer_profile_id:      profile.id,
      affiliate_telegram_id: aUser.id,
      plan:                  payload,
      stars_total:           paymentData.total_amount,
      affiliate_stars:       affiliateInfo.amount ?? 0,
      commission_per_mille:  affiliateInfo.commission_per_mille ?? 0,
      telegram_charge_id:    paymentData.telegram_payment_charge_id,
    });
  }

  const planLabel: Record<string, Record<Lang, string>> = {
    pro_monthly:  { en: '🗓 Monthly plan (30 days)',    ru: '🗓 Месячный план (30 дней)'    },
    pro_yearly:   { en: '📅 Yearly plan (365 days)',    ru: '📅 Годовой план (365 дней)'    },
    pro_lifetime: { en: '♾ Lifetime access',           ru: '♾ Пожизненный доступ'         },
  };

  await send(chatId,
    lang === 'en'
      ? `✅ <b>SubEasy PRO activated!</b>\n\n${planLabel[payload]?.en ?? 'PRO'}\n\nOpen the app — all features are available 🚀`
      : `✅ <b>SubEasy PRO активирован!</b>\n\n${planLabel[payload]?.ru ?? 'PRO'}\n\nОткройте приложение — все функции доступны 🚀`,
    { reply_markup: { inline_keyboard: [[kbOpen(lang)]] } },
  );
}

// ─── Main route ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Verify Telegram secret
  const secret = req.headers.get('x-telegram-bot-api-secret-token');
  const valid  = (() => {
    try {
      if (!WEBHOOK_SECRET || !secret) return false;
      const a = Buffer.from(secret);
      const b = Buffer.from(WEBHOOK_SECRET);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch { return false; }
  })();
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const update = await req.json().catch(() => null);
  if (!update) return NextResponse.json({ ok: true });

  // ── pre_checkout_query (Stars) ──
  if (update.pre_checkout_query) {
    const pcq: Record<string, unknown> = update.pre_checkout_query;
    if (!VALID_PLANS.has(pcq.invoice_payload as string)) {
      await answerPreCheckout(pcq.id as string, false, 'Unknown plan');
    } else {
      await answerPreCheckout(pcq.id as string, true);
    }
    return NextResponse.json({ ok: true });
  }

  // ── successful_payment (Stars) ──
  if (update.message?.successful_payment) {
    const chatId = update.message.chat.id as number;
    const lang   = await getLang(chatId);
    await handleStarsPayment(update, lang);
    return NextResponse.json({ ok: true });
  }

  // ── Message commands ──
  if (update.message?.text) {
    const msg    = update.message as Record<string, unknown>;
    const chatId = (msg.chat as Record<string, unknown>).id as number;
    const userId = (msg.from as Record<string, unknown>).id as number;
    const text   = msg.text as string;
    const lang   = await getLang(chatId);

    if (text.startsWith('/start'))       { await cmdStart(chatId, lang); }
    else if (text.startsWith('/pro'))    { await cmdPro(chatId, lang); }
    else if (text.startsWith('/status')) { await cmdStatus(chatId, userId, lang); }
    else if (text.startsWith('/language') || text.startsWith('/lang')) { await cmdLanguage(chatId, lang); }
    else if (text.startsWith('/help'))   { await cmdHelp(chatId, lang); }
    else if (text.startsWith('/support') || text.startsWith('/paysupport')) { await cmdSupport(chatId, lang); }
    else if (text.startsWith('/delete_data')) { await cmdDeleteData(chatId, lang); }

    return NextResponse.json({ ok: true });
  }

  // ── Callback queries (inline buttons) ──
  if (update.callback_query) {
    const cb     = update.callback_query as Record<string, unknown>;
    const cbId   = cb.id as string;
    const cbData = (cb.data as string) ?? '';
    const msg    = cb.message as Record<string, unknown>;
    const chatId = (msg.chat as Record<string, unknown>).id as number;
    const msgId  = msg.message_id as number;
    const from   = cb.from as Record<string, unknown>;
    const userId = from.id as number;
    const lang   = await getLang(chatId);

    await answerCB(cbId); // acknowledge immediately

    // lang:en | lang:ru
    if (cbData.startsWith('lang:')) {
      const newLang = cbData.split(':')[1] as Lang;
      await setLang(chatId, newLang);
      const txt = newLang === 'en' ? '🇬🇧 Language set to English' : '🇷🇺 Язык изменён на русский';
      await edit(chatId, msgId, `🌐 <b>Language / Язык</b>\n\n${txt}`, {
        reply_markup: {
          inline_keyboard: [[
            { text: `🇬🇧 English${newLang === 'en' ? ' ✓' : ''}`, callback_data: 'lang:en' },
            { text: `🇷🇺 Русский${newLang === 'ru' ? ' ✓' : ''}`, callback_data: 'lang:ru' },
          ]],
        },
      });
    }

    // pro — show plan selector
    else if (cbData === 'pro') {
      await cmdPro(chatId, lang, msgId);
    }

    // plan:monthly | plan:yearly | plan:lifetime
    else if (cbData.startsWith('plan:')) {
      const plan = cbData.split(':')[1] as Plan;
      if (plan in PLANS) await cbPlan(chatId, msgId, plan, lang);
    }

    // stars:plan
    else if (cbData.startsWith('stars:')) {
      const plan = cbData.split(':')[1] as Plan;
      if (plan in PLANS) await cbStars(chatId, plan, lang);
    }

    // ton:plan
    else if (cbData.startsWith('ton:')) {
      const plan = cbData.split(':')[1] as Plan;
      if (plan in PLANS) await cbTon(chatId, userId, plan, lang);
    }

    // check_ton:memo
    else if (cbData.startsWith('check_ton:')) {
      const memo = cbData.slice('check_ton:'.length);
      await cbCheckTon(chatId, memo, cbId, lang);
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

// ─── Setup: register bot commands (call GET /api/telegram/webhook?setup=1 once) ──

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token || token !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await tg('setMyCommands', {
    commands: [
      { command: 'start',       description: '🚀 Open SubEasy' },
      { command: 'pro',         description: '👑 Get PRO access' },
      { command: 'status',      description: '📊 My account status' },
      { command: 'language',    description: '🌐 Switch language / Сменить язык' },
      { command: 'help',        description: '❓ Help & commands' },
      { command: 'support',     description: '💬 Contact support' },
      { command: 'delete_data', description: '🗑 Delete my data' },
    ],
  });

  return NextResponse.json({ ok: true, message: 'Bot commands registered ✓' });
}
