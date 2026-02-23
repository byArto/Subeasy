import { DisplayCurrency, Subscription } from '@/lib/types';
import { Lang, translate } from '@/lib/translations';
import { CURRENCY_SYMBOLS, DEFAULT_CATEGORY_NAME_KEYS } from '@/lib/constants';
import { getSpendBadge } from '@/lib/badge';
import { getMonthlyPrice, convertCurrency } from '@/lib/utils';

interface ShareCanvasInput {
  totalMonthly: number;
  totalYearly: number;
  activeCount: number;
  currency: DisplayCurrency;
  subscriptions: Subscription[];
  lang: Lang;
  exchangeRate: number;
}

const BAR_COLORS = ['#39FF14', '#2ECC10', '#1A8C0A', '#0F5206'];
const W = 360;
const PAD = 24;
const SCALE = 2;
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

function getMonthLabel(lang: Lang): string {
  const now = new Date();
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';
  const month = now.toLocaleDateString(locale, { month: 'long' });
  const year = now.getFullYear();
  return month.charAt(0).toUpperCase() + month.slice(1) + ' ' + year;
}

/** Translate category ID → display name */
function resolveCategoryName(catId: string, t: (k: string) => string): string {
  const key = DEFAULT_CATEGORY_NAME_KEYS[catId];
  if (key) return t(key);
  // Custom category — use the value itself, capitalised
  return catId.charAt(0).toUpperCase() + catId.slice(1);
}

function buildCategories(
  subscriptions: Subscription[],
  currency: DisplayCurrency,
  exchangeRate: number,
  totalMonthly: number,
  t: (k: string) => string,
): Array<{ name: string; amount: number; pct: number }> {
  const totals: Record<string, number> = {};
  for (const sub of subscriptions) {
    if (!sub.isActive || sub.cycle === 'trial' || sub.cycle === 'one-time') continue;
    const monthly = getMonthlyPrice(sub);
    const converted = convertCurrency(monthly, sub.currency, currency, exchangeRate);
    const cat = sub.category || 'other';
    totals[cat] = (totals[cat] || 0) + converted;
  }
  return Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([catId, amount]) => ({
      name: resolveCategoryName(catId, t),
      amount,
      pct: totalMonthly > 0 ? (amount / totalMonthly) * 100 : 0,
    }));
}

function rrect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Draw neon corner bracket at (cx, cy), opening toward (dirX, dirY): +1 or -1 */
function cornerBracket(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  dirX: number, dirY: number,
  size: number,
) {
  const tx = dirX * size; // horizontal arm length
  const ty = dirY * size; // vertical arm length
  ctx.beginPath();
  ctx.moveTo(cx + tx, cy);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx, cy + ty);
  ctx.stroke();
}

export function buildShareCanvas(input: ShareCanvasInput): HTMLCanvasElement {
  const { totalMonthly, totalYearly, activeCount, currency, subscriptions, lang, exchangeRate } = input;
  const t = (key: string) => translate(key, lang);
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const badge = getSpendBadge(totalMonthly, currency);
  const monthLabel = getMonthLabel(lang);
  const categories = buildCategories(subscriptions, currency, exchangeRate, totalMonthly, t);
  const formattedMonthly = Math.round(totalMonthly).toLocaleString('ru-RU');
  const formattedYearly = Math.round(totalYearly).toLocaleString('ru-RU');

  // Layout constants — each category row: 16px label + 6px gap + 5px bar = 27px
  const CAT_ITEM_H = 27;
  const CAT_GAP = 11;
  const CAT_PAD = 14;
  const BADGE_H = 38;

  const catVisualH = categories.length > 0
    ? CAT_PAD * 2 + categories.length * CAT_ITEM_H + Math.max(0, categories.length - 1) * CAT_GAP
    : 0;
  const catBlockH = catVisualH + (categories.length > 0 ? 18 : 0);

  const H = PAD
    + 14 + 16       // header + margin
    + 1 + 20        // divider + margin
    + 14 + 6        // amount label + margin
    + 52 + 22       // big number + margin
    + catBlockH
    + 14 + 16       // stats row + margin
    + BADGE_H + 16  // badge + margin
    + 1 + 12        // divider + margin
    + 14            // footer
    + PAD;

  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);

  // ── Clip to card shape ────────────────────────
  rrect(ctx, 0, 0, W, H, 20);
  ctx.clip();

  // ── Background ───────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, W * 0.4, H);
  bgGrad.addColorStop(0, '#0d0d18');
  bgGrad.addColorStop(0.5, '#090909');
  bgGrad.addColorStop(1, '#0b0f0b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Larger blue glow — bottom left
  const blueGlow = ctx.createRadialGradient(-40, H + 40, 0, -40, H + 40, 260);
  blueGlow.addColorStop(0, 'rgba(50,70,255,0.1)');
  blueGlow.addColorStop(1, 'rgba(50,70,255,0)');
  ctx.fillStyle = blueGlow;
  ctx.fillRect(-80, H - 200, 360, 360);

  // Green glow — top right
  const greenGlow = ctx.createRadialGradient(W + 40, -40, 0, W + 40, -40, 220);
  greenGlow.addColorStop(0, 'rgba(57,255,20,0.1)');
  greenGlow.addColorStop(1, 'rgba(57,255,20,0)');
  ctx.fillStyle = greenGlow;
  ctx.fillRect(W - 180, -60, 300, 300);

  // Subtle centre glow behind the main number
  const centreGlow = ctx.createRadialGradient(W / 2, H * 0.32, 0, W / 2, H * 0.32, 130);
  centreGlow.addColorStop(0, 'rgba(57,255,20,0.05)');
  centreGlow.addColorStop(1, 'rgba(57,255,20,0)');
  ctx.fillStyle = centreGlow;
  ctx.fillRect(0, 0, W, H);

  // Dot grid (replaces horizontal lines — more premium feel)
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  const DOT_SPACING = 20;
  for (let gx = DOT_SPACING / 2; gx < W; gx += DOT_SPACING) {
    for (let gy = DOT_SPACING / 2; gy < H; gy += DOT_SPACING) {
      ctx.beginPath();
      ctx.arc(gx, gy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Neon top border
  const topBorder = ctx.createLinearGradient(W * 0.08, 0, W * 0.92, 0);
  topBorder.addColorStop(0, 'rgba(57,255,20,0)');
  topBorder.addColorStop(0.5, 'rgba(57,255,20,0.85)');
  topBorder.addColorStop(1, 'rgba(57,255,20,0)');
  ctx.fillStyle = topBorder;
  ctx.fillRect(W * 0.08, 0, W * 0.84, 2);

  // Corner bracket accents (neon green, inset from corners)
  {
    const BM = 16;   // margin from card edge
    const BS = 14;   // arm length
    ctx.strokeStyle = 'rgba(57,255,20,0.4)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'square';
    cornerBracket(ctx, BM, BM, 1, 1, BS);          // top-left
    cornerBracket(ctx, W - BM, BM, -1, 1, BS);     // top-right
    cornerBracket(ctx, BM, H - BM, 1, -1, BS);     // bottom-left
    cornerBracket(ctx, W - BM, H - BM, -1, -1, BS);// bottom-right
    ctx.lineCap = 'butt';
  }

  // ── Content ──────────────────────────────────
  let y = PAD;

  // Header
  ctx.textBaseline = 'top';
  ctx.font = `800 14px ${FONT}`;
  ctx.fillStyle = '#39FF14';
  ctx.textAlign = 'left';
  ctx.fillText('SubEasy', PAD, y + 1);

  ctx.font = `500 11px ${FONT}`;
  ctx.fillStyle = '#555555';
  ctx.textAlign = 'right';
  ctx.fillText(monthLabel, W - PAD, y + 2);

  y += 14 + 16;

  // Divider 1
  const d1 = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
  d1.addColorStop(0, 'rgba(57,255,20,0.08)');
  d1.addColorStop(0.5, 'rgba(57,255,20,0.22)');
  d1.addColorStop(1, 'rgba(57,255,20,0.08)');
  ctx.fillStyle = d1;
  ctx.fillRect(PAD, y, W - PAD * 2, 1);

  y += 1 + 20;

  // Amount label
  ctx.font = `500 11px ${FONT}`;
  ctx.fillStyle = '#555555';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(t('share.perMonth').toUpperCase(), W / 2, y + 1);

  y += 14 + 6;

  // Big amount
  ctx.font = `800 52px ${FONT}`;
  const numW = ctx.measureText(formattedMonthly).width;
  ctx.font = `700 22px ${FONT}`;
  const symStr = ' ' + symbol;
  const symW = ctx.measureText(symStr).width;
  const amtStartX = (W - numW - symW) / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(57,255,20,0.4)';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#39FF14';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `800 52px ${FONT}`;
  ctx.fillText(formattedMonthly, amtStartX, y);
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText(symStr, amtStartX + numW, y + 26);
  ctx.restore();

  y += 52 + 22;

  // ── Category bars panel ───────────────────────
  if (categories.length > 0) {
    const pX = PAD;
    const pW = W - PAD * 2;

    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    rrect(ctx, pX, y, pW, catVisualH, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    rrect(ctx, pX, y, pW, catVisualH, 12);
    ctx.stroke();

    const iX = pX + 14;
    const iW = pW - 28;
    let catY = y + CAT_PAD;

    for (let i = 0; i < categories.length; i++) {
      const { name, amount, pct } = categories[i];
      const color = BAR_COLORS[i];

      // Label row: dot + category name (left) + amount (right)
      const labelMidY = catY + 8;

      // Color dot
      ctx.save();
      ctx.fillStyle = color;
      ctx.shadowColor = color + '90';
      ctx.shadowBlur = 7;
      ctx.beginPath();
      ctx.arc(iX + 3, labelMidY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Category name — translated, max 55% of inner width
      ctx.font = `600 12px ${FONT}`;
      ctx.fillStyle = '#bbbbbb';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const maxNameW = iW * 0.55;
      let displayName = name;
      while (displayName.length > 2 && ctx.measureText(displayName).width > maxNameW) {
        displayName = displayName.slice(0, -1);
      }
      if (displayName !== name) displayName += '…';
      ctx.fillText(displayName, iX + 12, labelMidY);

      // Amount
      const amtStr = `${Math.round(amount).toLocaleString('ru-RU')} ${symbol}`;
      ctx.font = `700 12px ${FONT}`;
      ctx.fillStyle = '#dddddd';
      ctx.textAlign = 'right';
      ctx.fillText(amtStr, iX + iW, labelMidY);

      // Progress bar
      const barY = catY + 16 + 6; // below 16px label row + 6px gap
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      rrect(ctx, iX, barY, iW, 5, 2.5);
      ctx.fill();

      const fillW = Math.max((pct / 100) * iW, 2);
      const barGrad = ctx.createLinearGradient(iX, 0, iX + fillW, 0);
      barGrad.addColorStop(0, color);
      barGrad.addColorStop(1, color + '99');
      ctx.save();
      ctx.fillStyle = barGrad;
      ctx.shadowColor = color + '60';
      ctx.shadowBlur = 8;
      rrect(ctx, iX, barY, fillW, 5, 2.5);
      ctx.fill();
      ctx.restore();

      catY += CAT_ITEM_H;
      if (i < categories.length - 1) catY += CAT_GAP;
    }

    y += catBlockH;
  }

  // ── Stats row ─────────────────────────────────
  {
    const subText = `${activeCount} ${t('share.subsCount')}`;
    const sepText = '  •  ';
    const yrText = `${formattedYearly} ${symbol} ${t('share.perYear')}`;
    ctx.font = `500 11px ${FONT}`;
    ctx.textBaseline = 'middle';
    const sw = ctx.measureText(subText).width;
    const spw = ctx.measureText(sepText).width;
    const yw = ctx.measureText(yrText).width;
    const statsX = (W - sw - spw - yw) / 2;
    const midY = y + 7;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#444444';
    ctx.fillText(subText, statsX, midY);
    ctx.fillStyle = '#2a2a2a';
    ctx.fillText(sepText, statsX + sw, midY);
    ctx.fillStyle = '#444444';
    ctx.fillText(yrText, statsX + sw + spw, midY);

    y += 14 + 16;
  }

  // ── Badge pill ────────────────────────────────
  {
    const badgeText = `${badge.emoji}  ${t(badge.labelKey)}`;
    ctx.font = `700 13px ${FONT}`;
    ctx.textBaseline = 'middle';
    const btw = ctx.measureText(badgeText).width;
    const bpw = 18;
    const bW = btw + bpw * 2;
    const bX = (W - bW) / 2;

    ctx.fillStyle = 'rgba(57,255,20,0.07)';
    rrect(ctx, bX, y, bW, BADGE_H, BADGE_H / 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(57,255,20,0.25)';
    ctx.lineWidth = 1;
    rrect(ctx, bX, y, bW, BADGE_H, BADGE_H / 2);
    ctx.stroke();

    ctx.fillStyle = '#39FF14';
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, W / 2, y + BADGE_H / 2);

    y += BADGE_H + 16;
  }

  // Divider 2
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(PAD, y, W - PAD * 2, 1);
  y += 1 + 12;

  // Footer CTA
  ctx.font = `500 11px ${FONT}`;
  ctx.fillStyle = '#3a3a3a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`${t('share.cta')} ↗`, W / 2, y + 1);

  return canvas;
}
