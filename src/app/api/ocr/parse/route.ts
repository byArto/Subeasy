import { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/ratelimit';
import { verifyAuth } from '@/lib/supabase-server';

/**
 * OCR receipt/screenshot → subscription fields, via OpenAI vision.
 *
 * - The OpenAI key is read server-side only (OPENAI_API_KEY) and never reaches
 *   the client. If it is absent the feature reports itself as unavailable.
 * - The uploaded image is forwarded to OpenAI to extract details and is NOT
 *   stored or logged by us.
 * - Three rate-limit tiers protect cost: per-user burst, per-user/day, and a
 *   global daily circuit breaker. All limits are env-overridable.
 */

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.OCR_MODEL || 'gpt-4o-mini';
const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // ~6MB decoded budget
// 'high' tiles the image at higher resolution → much better on small/blurry
// text (a few extra tokens). Set OCR_IMAGE_DETAIL=low to cut cost.
const IMAGE_DETAIL: 'high' | 'low' = process.env.OCR_IMAGE_DETAIL === 'low' ? 'low' : 'high';

const PER_USER_PER_DAY = Number(process.env.OCR_LIMIT_PER_DAY || 20);
const PER_USER_BURST = Number(process.env.OCR_LIMIT_BURST || 5);
const GLOBAL_PER_DAY = Number(process.env.OCR_LIMIT_GLOBAL || 1000);

const ALLOWED_CURRENCIES = ['RUB', 'USD', 'EUR'];
const ALLOWED_CYCLES = ['monthly', 'yearly', 'quarterly', 'one-time', 'trial'];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Capability probe — lets the client hide the Scan button when OCR isn't configured. */
export async function GET() {
  return json({ available: Boolean(process.env.OPENAI_API_KEY) });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return json({ error: 'ocr_unavailable' }, 503);

  // Identify caller for rate limiting: signed-in user id, else IP.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
  const user = await verifyAuth(req).catch(() => null);
  const id = user?.id ?? `ip:${ip}`;

  if (!(await checkRateLimit('ocr-global', 'global', GLOBAL_PER_DAY, 86400))) {
    return json({ error: 'busy' }, 429);
  }
  if (!(await checkRateLimit('ocr-burst', id, PER_USER_BURST, 60))) {
    return json({ error: 'rate_limited' }, 429);
  }
  if (!(await checkRateLimit('ocr-day', id, PER_USER_PER_DAY, 86400))) {
    return json({ error: 'daily_limit' }, 429);
  }

  let image: string;
  try {
    const body = await req.json();
    image = String(body?.image ?? '');
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  if (!image.startsWith('data:image/')) return json({ error: 'bad_image' }, 400);
  const b64 = image.slice(image.indexOf(',') + 1);
  if (b64.length * 0.75 > MAX_IMAGE_BYTES) return json({ error: 'too_large' }, 413);

  const system = `You extract subscription / recurring-payment details from an image. It may be a receipt, an order or payment-confirmation email, an App Store or Google Play receipt, a bank push/SMS, or an in-app billing screen, in ANY language.

Return ONLY a JSON object with exactly these keys:
- "name": the service/brand being paid for, short (e.g. "Netflix", "Spotify", "ChatGPT"). Drop plan words like "Premium"/"Plus" unless they are part of the brand. "" if not visible.
- "price": the recurring charge as a number — no currency symbol, no thousands separators, dot for decimals. Examples: "599,00 руб." -> 599, "1 199 ₽" -> 1199, "$9.99" -> 9.99, "€12,50" -> 12.5. 0 if not visible.
- "currency": one of "RUB","USD","EUR". Infer from symbols/codes: ₽ / руб / р. / RUB -> RUB; $ / USD / US$ -> USD; € / EUR -> EUR. If unclear but the text is Russian, prefer "RUB". Default "RUB".
- "cycle": one of "monthly","yearly","quarterly","one-time","trial". Infer from wording in any language: month / мес / в месяц / monthly / /mo -> monthly; year / год / в год / annual / /yr -> yearly; quarter / квартал -> quarterly; single purchase / разовый / lifetime -> one-time; free trial / пробный период / trial -> trial. Default "monthly".
- "nextPaymentDate": the NEXT charge / renewal date as ISO "YYYY-MM-DD". Use the upcoming renewal date when shown ("Следующее списание", "Renews on", "Next billing date"). Do NOT use the date the receipt/email was issued. "" if no clear future date is shown.
- "confidence": number 0..1. Be honest: >0.7 only when both name and price are clearly readable; lower it for blurry, partial, or ambiguous text; 0 if the image is not a subscription/payment at all.

Never invent values you cannot actually read — leave them "" or 0. Output JSON only, no prose.`;

  let aiResp: Response;
  try {
    aiResp = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        max_tokens: 300,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract the subscription details as JSON.' },
              { type: 'image_url', image_url: { url: image, detail: IMAGE_DETAIL } },
            ],
          },
        ],
      }),
    });
  } catch {
    return json({ error: 'upstream' }, 502);
  }

  if (!aiResp.ok) return json({ error: 'upstream' }, 502);

  let parsed: {
    name?: unknown; price?: unknown; currency?: unknown;
    cycle?: unknown; nextPaymentDate?: unknown; confidence?: unknown;
  };
  try {
    const data = await aiResp.json();
    const content = data?.choices?.[0]?.message?.content ?? '{}';
    parsed = JSON.parse(content);
  } catch {
    return json({ error: 'parse' }, 502);
  }

  const price = Number(parsed.price);
  const confidence = Number(parsed.confidence);
  const result = {
    name: typeof parsed.name === 'string' ? parsed.name.slice(0, 60) : '',
    price: Number.isFinite(price) ? Math.max(0, price) : 0,
    currency: ALLOWED_CURRENCIES.includes(String(parsed.currency)) ? String(parsed.currency) : 'RUB',
    cycle: ALLOWED_CYCLES.includes(String(parsed.cycle)) ? String(parsed.cycle) : 'monthly',
    nextPaymentDate: /^\d{4}-\d{2}-\d{2}$/.test(String(parsed.nextPaymentDate)) ? String(parsed.nextPaymentDate) : '',
    confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0,
  };

  return json({ ok: true, data: result });
}
