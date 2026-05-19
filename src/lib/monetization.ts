type EnvLike = Record<string, string | undefined>;

export interface EffectiveProStatusInput {
  isPro: boolean;
  proUntil: Date | null;
  now?: Date;
  env?: EnvLike;
}

export interface MonetizationConfig {
  monetizationEnabled: boolean;
  freeProAccess: boolean;
}

function readEnv(env?: EnvLike): EnvLike {
  return env ?? process.env;
}

function isEnabled(value: string | undefined): boolean {
  return value === '1' || value === 'true' || value === 'yes';
}

function isDisabled(value: string | undefined): boolean {
  return value === '0' || value === 'false' || value === 'no';
}

export function getMonetizationConfig(env?: EnvLike): MonetizationConfig {
  const source = readEnv(env);
  const monetizationEnabled = isEnabled(source.NEXT_PUBLIC_MONETIZATION_ENABLED);

  return {
    monetizationEnabled,
    freeProAccess: !monetizationEnabled,
  };
}

export function isMonetizationEnabled(env?: EnvLike): boolean {
  return getMonetizationConfig(env).monetizationEnabled;
}

export function getEffectiveProStatus({
  isPro,
  proUntil,
  now = new Date(),
  env,
}: EffectiveProStatusInput): { isPro: boolean; proUntil: Date | null } {
  if (getMonetizationConfig(env).freeProAccess) {
    return { isPro: true, proUntil: null };
  }

  return {
    isPro: isPro && (!proUntil || proUntil > now),
    proUntil,
  };
}

export function shouldIncludeFreeUsersInTelegramCron(env?: EnvLike): boolean {
  return !isDisabled(readEnv(env).TELEGRAM_NOTIFICATIONS_FOR_FREE_USERS);
}

export function getNotifyCronMaxUsers(env?: EnvLike): number {
  const raw = readEnv(env).NOTIFY_CRON_MAX_USERS;
  const parsed = raw ? Number.parseInt(raw, 10) : 500;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 500;
}

export function getNotifyCronTelegramBatchSize(env?: EnvLike): number {
  const raw = readEnv(env).NOTIFY_CRON_TELEGRAM_BATCH_SIZE;
  const parsed = raw ? Number.parseInt(raw, 10) : 20;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
}
