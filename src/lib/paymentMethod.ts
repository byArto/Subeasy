/**
 * Payment-method codec. The encoded string format `type:subtype:detail`
 * (documented in CLAUDE.md) is the single source of truth for parsing/encoding
 * a subscription's payment method. Display rendering (JSX) lives in the
 * components that present it.
 */

export type PaymentType = 'card' | 'crypto' | 'sbp' | 'other';
export type CardType = 'physical' | 'virtual';

export interface ParsedPaymentMethod {
  type: PaymentType;
  cardType: CardType;
  detail: string;
}

export function parsePaymentMethod(raw: string): ParsedPaymentMethod {
  if (raw.startsWith('card:')) {
    const rest = raw.substring(5);
    const idx = rest.indexOf(':');
    if (idx >= 0) {
      const ct = rest.substring(0, idx) === 'virtual' ? 'virtual' : 'physical';
      return { type: 'card', cardType: ct, detail: rest.substring(idx + 1) };
    }
    return { type: 'card', cardType: 'physical', detail: '' };
  }
  if (raw.startsWith('crypto:')) return { type: 'crypto', cardType: 'physical', detail: raw.substring(7) };
  if (raw.startsWith('sbp:'))    return { type: 'sbp',    cardType: 'physical', detail: raw.substring(4) };
  if (raw.startsWith('paypal:')) return { type: 'sbp',    cardType: 'physical', detail: raw.substring(7) }; // migrate paypal → sbp
  if (raw.startsWith('other:'))  return { type: 'other',  cardType: 'physical', detail: raw.substring(6) };

  // Legacy plain-string values
  if (raw === 'Карта' || raw === 'Apple Pay' || raw === 'Google Pay') return { type: 'card', cardType: 'physical', detail: '' };
  if (raw === 'Крипто') return { type: 'crypto', cardType: 'physical', detail: '' };
  if (raw === 'PayPal' || raw === 'СБП') return { type: 'sbp', cardType: 'physical', detail: '' };
  return { type: 'other', cardType: 'physical', detail: raw === 'Другое' ? '' : raw };
}

export function encodePaymentMethod(type: PaymentType, cardType: CardType, detail: string): string {
  const d = detail.trim();
  switch (type) {
    case 'card':   return `card:${cardType}:${d}`;
    case 'crypto': return `crypto:${d}`;
    case 'sbp':    return `sbp:${d}`;
    case 'other':  return `other:${d}`;
  }
}
