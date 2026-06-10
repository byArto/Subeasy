'use client';

// TEMPORARY diagnostic — renders whether the PUBLIC VAPID key was inlined into the
// CLIENT bundle at build time (a 'use client' component sees only build-inlined env).
// data-len = key length (87 when present, 0 when missing). Remove after verifying push.
export function VapidProbe() {
  const len = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').length;
  return <div id="vapid-probe" data-len={len} aria-hidden="true" style={{ display: 'none' }} />;
}
