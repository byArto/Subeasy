'use client';

import { useState } from 'react';
import { getServiceDomain, getLogoUrl } from '@/lib/services';
import { cn } from '@/lib/utils';
import { Glyph, type AppIconName } from '@/components/ui/AppIcon';

interface ServiceLogoProps {
  name: string;
  /** Either an emoji, or an `appicon:<name>` token for a custom line icon. */
  emoji: string;
  size?: number;
  /** Colour for a custom (`appicon:`) glyph. Falls back to currentColor. */
  color?: string;
  className?: string;
}

const APPICON_PREFIX = 'appicon:';

export function ServiceLogo({ name, emoji, size = 24, color, className }: ServiceLogoProps) {
  const domain = getServiceDomain(name);
  const [failed, setFailed] = useState(false);

  // Known service → real brand logo from the CDN (wins over any picked icon).
  if (!domain || failed) {
    // Custom line icon picked in the form.
    if (emoji && emoji.startsWith(APPICON_PREFIX)) {
      return (
        <Glyph
          name={emoji.slice(APPICON_PREFIX.length) as AppIconName}
          color={color ?? 'currentColor'}
          size={size}
          // Keep the visible stroke ~constant (~1.7px) whatever the icon size.
          strokeWidth={Math.max(0.8, 41 / size)}
          className={className}
        />
      );
    }
    return <span className={cn('flex items-center justify-center', className)}>{emoji}</span>;
  }

  return (
    <img
      src={getLogoUrl(domain, size >= 64 ? 128 : 64)}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('rounded-md object-contain', className)}
    />
  );
}
