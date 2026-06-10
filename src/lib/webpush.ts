import webpush from 'web-push';

/**
 * Server-side Web Push helper (Node runtime only — never import in client/edge code).
 *
 * No-ops gracefully when VAPID keys are absent: `isPushConfigured()` returns false
 * and nothing is sent, so the feature can ship before the env vars exist without
 * breaking anything (same pattern as the OCR OpenAI key).
 */

let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@subeasy.org';
  if (!publicKey || !privateKey) {
    configured = false;
    return false;
  }
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  } catch {
    configured = false;
  }
  return configured;
}

export function isPushConfigured(): boolean {
  return ensureConfigured();
}

export interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** 'sent' = delivered to push service; 'expired' = subscription gone (prune it); 'error' = transient. */
export type PushResult = 'sent' | 'expired' | 'error';

export async function sendPush(sub: PushSubscriptionRow, payload: PushPayload): Promise<PushResult> {
  if (!ensureConfigured()) return 'error';
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 }, // keep for 24h if device offline
    );
    return 'sent';
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    // 404/410 = the browser/OS dropped this subscription → caller should delete it.
    if (status === 404 || status === 410) return 'expired';
    return 'error';
  }
}
