'use client';

import { SERVICE_CATALOG } from '@/lib/services';
import { ServiceLogo } from '@/components/ui/ServiceLogo';

/* Split catalog into two rows */
const ROW_1 = SERVICE_CATALOG.filter((_, i) => i % 2 === 0);
const ROW_2 = SERVICE_CATALOG.filter((_, i) => i % 2 === 1);

function MarqueePill({ name, emoji, color }: { name: string; emoji: string; color: string }) {
  return (
    <div
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-white/[0.06] shrink-0"
      style={{ background: `${color}08` }}
    >
      <ServiceLogo name={name} emoji={emoji} size={18} />
      <span className="text-[11px] text-text-muted whitespace-nowrap font-medium">
        {name}
      </span>
    </div>
  );
}

function MarqueeRow({
  items,
  direction,
}: {
  items: typeof SERVICE_CATALOG;
  direction: 'left' | 'right';
}) {
  return (
    <div className="overflow-hidden">
      <div
        className="flex gap-2.5 w-max"
        style={{
          animation: `marquee-${direction} 45s linear infinite`,
          willChange: 'transform',
        }}
      >
        {/* Original + duplicate for seamless loop */}
        {items.map((svc, i) => (
          <MarqueePill key={`a-${i}`} name={svc.name} emoji={svc.emoji} color={svc.color} />
        ))}
        {items.map((svc, i) => (
          <MarqueePill key={`b-${i}`} name={svc.name} emoji={svc.emoji} color={svc.color} />
        ))}
      </div>
    </div>
  );
}

export function LogoMarquee() {
  return (
    <div
      className="-mx-5 opacity-60"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
      }}
    >
      <div className="space-y-2.5 py-1">
        <MarqueeRow items={ROW_1} direction="left" />
        <MarqueeRow items={ROW_2} direction="right" />
      </div>
    </div>
  );
}
