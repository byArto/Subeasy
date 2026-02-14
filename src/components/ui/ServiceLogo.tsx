'use client';

import { useState } from 'react';
import { getServiceDomain, getLogoUrl } from '@/lib/services';
import { cn } from '@/lib/utils';

interface ServiceLogoProps {
  name: string;
  emoji: string;
  size?: number;
  className?: string;
}

export function ServiceLogo({ name, emoji, size = 24, className }: ServiceLogoProps) {
  const domain = getServiceDomain(name);
  const [failed, setFailed] = useState(false);

  if (!domain || failed) {
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
