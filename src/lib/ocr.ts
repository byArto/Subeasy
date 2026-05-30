import { getAuthToken } from '@/lib/supabase';
import type { Currency, BillingCycle } from '@/lib/types';

export interface OcrResult {
  name: string;
  price: number;
  currency: Currency;
  cycle: BillingCycle;
  nextPaymentDate: string;
  confidence: number;
}

export type OcrError =
  | 'ocr_unavailable'
  | 'rate_limited'
  | 'daily_limit'
  | 'busy'
  | 'bad_image'
  | 'too_large'
  | 'upstream'
  | 'parse'
  | 'network'
  | 'bad_request';

/**
 * Downscale + recompress an image File to a JPEG data URL whose long side is at
 * most `maxDim`. Keeps upload small (cheaper, faster OCR) without touching the
 * original file.
 */
export async function fileToDownscaledDataUrl(file: File, maxDim = 1280, quality = 0.8): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close?.();
    throw new Error('no-canvas');
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', quality);
}

/** Returns true only when the server has an OCR provider configured. */
export async function isOcrAvailable(): Promise<boolean> {
  try {
    const res = await fetch('/api/ocr/parse', { method: 'GET' });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data?.available);
  } catch {
    return false;
  }
}

export async function scanReceipt(
  file: File,
): Promise<{ ok: true; data: OcrResult } | { ok: false; error: OcrError }> {
  let image: string;
  try {
    image = await fileToDownscaledDataUrl(file);
  } catch {
    return { ok: false, error: 'bad_image' };
  }

  let token: string | null = null;
  try {
    token = await getAuthToken();
  } catch {
    /* anonymous — rate-limited by IP server-side */
  }

  let res: Response;
  try {
    res = await fetch('/api/ocr/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ image }),
    });
  } catch {
    return { ok: false, error: 'network' };
  }

  let data: { ok?: boolean; data?: OcrResult; error?: OcrError };
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: 'parse' };
  }

  if (res.ok && data?.ok && data.data) return { ok: true, data: data.data };
  return { ok: false, error: (data?.error as OcrError) || 'upstream' };
}
