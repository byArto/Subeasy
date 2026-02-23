import { DisplayCurrency, Subscription } from '@/lib/types';
import { Lang, translate } from '@/lib/translations';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
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

function buildCategories(
  subscriptions: Subscription[],
  currency: DisplayCurrency,
  exchangeRate: number,
  totalMonthly: number,
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
    .map(([name, amount]) => ({
      name,
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

export function buildShareCanvas(input: ShareCanvasInput): HTMLCanvasElement {
  const { totalMonthly, totalYearly, activeCount, currency, subscriptions, lang, exchangeRate } = input;
  const t = (key: string) => translate(key, lang);
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const badge = getSpendBadge(totalMonthly, currency);
  const monthLabel = getMonthLabel(lang);
  const categories = buildCategories(subscriptions, currency, exchangeRate, totalMonthly);
  const formattedMonthly = Math.round(totalMonthly).toLocaleString('ru-RU');
  const formattedYearly = Math.round(totalYearly).toLocaleString('ru-RU');

  // Layout constants
  const CAT_ITEM_H = 24; // 14px label row + 5px margin + 5px bar
  const CAT_GAP = 12;
  const CAT_PAD = 14; // panel padding top & bottom
  const BADGE_H = 38;

  const catVisualH = categories.length > 0
    ? CAT_PAD * 2 + categories.length * CAT_ITEM_H + Math.max(0, categories.length - 1) * CAT_GAP
    : 0;
  const catBlockH = catVisualH + (categories.length > 0 ? 18 : 0); // includes 18px margin below

  // Total canvas height
  const H = PAD         // top padding
    + 14 + 16           // header + margin
    + 1 + 20            // divider + margin
    + 14 + 6            // amount label + margin
    + 52 + 22           // big number + margin
    + catBlockH         // category panel (0 if empty)
    + 14 + 16           // stats row + margin
    + BADGE_H + 16      // badge + margin
    + 1 + 12            // divider + margin
    + 14                // footer
    + PAD;              // bottom padding

  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);

  // Clip everything to rounded card shape
  rrect(ctx, 0, 0, W, H, 20);
  ctx.clip();

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, W * 0.5, H);
  bgGrad.addColorStop(0, '#0e0e16');
  bgGrad.addColorStop(0.45, '#0a0a0a');
  bgGrad.addColorStop(1, '#0c100c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Blue glow — bottom left
  const blueGlow = ctx.createRadialGradient(-60, H + 60, 0, -60, H + 60, 220);
  blueGlow.addColorStop(0, 'rgba(60,80,255,0.07)');
  blueGlow.addColorStop(1, 'rgba(60,80,255,0)');
  ctx.fillStyle = blueGlow;
  ctx.fillRect(-80, H - 170, 310, 310);

  // Green glow — top right
  const greenGlow = ctx.createRadialGradient(W + 50, -50, 0, W + 50, -50, 200);
  greenGlow.addColorStop(0, 'rgba(57,255,20,0.09)');
  greenGlow.addColorStop(1, 'rgba(57,255,20,0)');
  ctx.fillStyle = greenGlow;
  ctx.fillRect(W - 160, -70, 280, 280);

  // Subtle horizontal grid lines
  ctx.lineWidth = 1;
  for (let gy = 0; gy < H; gy += 28) {
    ctx.strokeStyle = 'rgba(255,255,255,0.015)';
    ctx.beginPath();
    ctx.moveTo(0, gy + 0.5);
    ctx.lineTo(W, gy + 0.5);
    ctx.stroke();
  }

  // Neon top border
  const topBorder = ctx.createLinearGradient(W * 0.08, 0, W * 0.92, 0);
  topBorder.addColorStop(0, 'rgba(57,255,20,0)');
  topBorder.addColorStop(0.5, 'rgba(57,255,20,0.8)');
  topBorder.addColorStop(1, 'rgba(57,255,20,0)');
  ctx.fillStyle = topBorder;
  ctx.fillRect(W * 0.08, 0, W * 0.84, 2);

  // ── Content ──────────────────────────────────
  let y = PAD;

  // Header: SubEasy (left) + monthLabel (right)
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

  // Divider 1 (neon green gradient)
  const d1 = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
  d1.addColorStop(0, 'rgba(57,255,20,0.08)');
  d1.addColorStop(0.5, 'rgba(57,255,20,0.21)');
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

  // Big amount — measure both parts to center them as a unit
  ctx.font = `800 52px ${FONT}`;
  const numW = ctx.measureText(formattedMonthly).width;
  ctx.font = `700 22px ${FONT}`;
  const symStr = ' ' + symbol;
  const symW = ctx.measureText(symStr).width;
  const amtStartX = (W - numW - symW) / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(57,255,20,0.35)';
  ctx.shadowBlur = 20;
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

    // Panel background
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    rrect(ctx, pX, y, pW, catVisualH, 12);
    ctx.fill();

    // Panel border
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    rrect(ctx, pX, y, pW, catVisualH, 12);
    ctx.stroke();

    const iX = pX + 14;
    const iW = pW - 28;
    let catY = y + CAT_PAD;

    for (let i = 0; i < categories.length; i++) {
      const { name, amount, pct } = categories[i];
      const color = BAR_COLORS[i];
      const midY = catY + 7; // vertical center of the 14px label row

      // Color dot
      ctx.save();
      ctx.fillStyle = color;
      ctx.shadowColor = color + '80';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(iX + 3, midY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Category name (truncate if needed)
      ctx.font = `600 11px ${FONT}`;
      ctx.fillStyle = '#aaaaaa';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const maxNameW = iW * 0.52;
      let displayName = name.toUpperCase();
      while (displayName.length > 3 && ctx.measureText(displayName).width > maxNameW) {
        displayName = displayName.slice(0, -1);
      }
      if (displayName !== name.toUpperCase()) displayName += '…';
      ctx.fillText(displayName, iX + 12, midY);

      // Amount
      const amtStr = `${Math.round(amount).toLocaleString('ru-RU')} ${symbol}`;
      ctx.font = `700 12px ${FONT}`;
      ctx.fillStyle = '#cccccc';
      ctx.textAlign = 'right';
      ctx.fillText(amtStr, iX + iW, midY);

      // Bar track
      const barY = catY + 14 + 5;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      rrect(ctx, iX, barY, iW, 5, 2.5);
      ctx.fill();

      // Bar fill
      const fillW = Math.max((pct / 100) * iW, 2);
      const barGrad = ctx.createLinearGradient(iX, 0, iX + fillW, 0);
      barGrad.addColorStop(0, color);
      barGrad.addColorStop(1, color + '99');
      ctx.save();
      ctx.fillStyle = barGrad;
      ctx.shadowColor = color + '50';
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

    ctx.fillStyle = 'rgba(57,255,20,0.06)';
    rrect(ctx, bX, y, bW, BADGE_H, BADGE_H / 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(57,255,20,0.22)';
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
