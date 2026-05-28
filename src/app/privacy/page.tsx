export const metadata = {
  title: 'Privacy Policy — SubEasy',
  description: 'Privacy Policy for SubEasy subscription tracker',
};

export default function PrivacyPage() {
  return (
    <div
      style={{
        height: '100dvh',
        overflowY: 'auto',
        background: 'linear-gradient(to bottom, var(--color-surface), var(--color-surface-bottom))',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-body)',
        padding: '0 0 60px',
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: '1px solid var(--color-border-subtle)',
          padding: '20px 20px 16px',
          position: 'sticky',
          top: 0,
          background: 'color-mix(in srgb, var(--color-surface) 92%, transparent)',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 640, margin: '0 auto' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'color-mix(in srgb, var(--color-neon) 10%, transparent)',
              border: '1.5px solid var(--color-border-neon)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
            }}
          >
            🔒
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>SubEasy</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Privacy Policy · Политика конфиденциальности</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px 0' }}>

        {/* Date */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'color-mix(in srgb, var(--color-neon) 6%, transparent)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 8,
            padding: '4px 12px',
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 10, color: 'var(--color-neon)', fontWeight: 700, letterSpacing: '0.06em' }}>
            Последнее обновление / Last updated: 2 марта 2026
          </span>
        </div>

        <Section>
          <H2>О нас / About Us</H2>
          <P>
            SubEasy — трекер подписок, доступный как Telegram Mini App и PWA. Разработан
            независимым разработчиком (далее «мы», «разработчик»). Контакт: @by_arto в Telegram.
          </P>
          <P>
            SubEasy is a subscription tracker available as a Telegram Mini App and PWA, developed
            by an independent developer. Contact: @by_arto on Telegram.
          </P>
        </Section>

        <Section>
          <H2>Какие данные мы собираем / What Data We Collect</H2>
          <P>Мы собираем только данные, необходимые для работы сервиса:</P>
          <ul style={{ paddingLeft: 20, margin: '8px 0 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Li><b>Telegram ID, имя и username</b> — для идентификации аккаунта.</Li>
            <Li><b>Email</b> — если вы авторизованы через Supabase Auth (опционально).</Li>
            <Li><b>Данные подписок</b> — названия сервисов, суммы, даты оплаты, категории, которые вы вводите вручную.</Li>
            <Li><b>Данные семейного плана (Workspace)</b> — название плана, список участников (их Telegram ID), invite-токены.</Li>
            <Li><b>Настройки приложения</b> — валюта, язык, уведомления, бюджетный лимит.</Li>
            <Li><b>IP-адрес</b> — автоматически при обращении к нашему серверу (стандартное поведение веб-сервисов).</Li>
            <Li><b>Локальное хранилище (localStorage)</b> — язык интерфейса, активный воркспейс и настройки хранятся локально в вашем браузере. Эти данные не передаются на сервер.</Li>
          </ul>
          <P>
            <b>We collect only data necessary to provide the service:</b> Telegram ID, name and
            username; email (if signed in); subscription data you enter (names, amounts, dates,
            categories); workspace/family plan data; app settings; IP address (standard web
            behavior). We also use localStorage to store UI preferences (language, active workspace) locally in your
            browser — this data is never sent to our servers.
          </P>
        </Section>

        <Section>
          <H2>Как мы используем данные / How We Use Your Data</H2>
          <ul style={{ paddingLeft: 20, margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Li>Предоставление функций приложения (трекинг подписок, уведомления, отчёты).</Li>
            <Li>Синхронизация данных между устройствами через Supabase.</Li>
            <Li>Отправка Telegram-уведомлений (если вы подключили бота).</Li>
          </ul>
          <P>
            We use your data to: provide app features (subscription tracking, notifications, reports);
            sync data across devices via Supabase; send Telegram notifications if you connected the bot.
          </P>
          <P>
            Мы <b>не продаём</b> ваши данные, не передаём третьим лицам в маркетинговых целях, не
            создаём рекламные профили и не обучаем на них AI-модели.
          </P>
          <P>
            We do <b>not</b> sell your data, share it with third parties for marketing purposes, build
            advertising profiles, or use it to train AI models.
          </P>
        </Section>

        <Section>
          <H2>Хранение данных / Data Storage</H2>
          <P>
            Ваши данные хранятся в <b>Supabase</b> (PostgreSQL). Supabase работает на серверах AWS
            в регионе EU West (Ирландия). Supabase соответствует требованиям GDPR. Подробнее:{' '}
            <a href="https://supabase.com/privacy" style={{ color: 'var(--color-neon)' }} target="_blank" rel="noopener noreferrer">
              supabase.com/privacy
            </a>.
          </P>
          <P>
            Your data is stored in <b>Supabase</b> (PostgreSQL), running on AWS EU West (Ireland).
            Supabase is GDPR compliant.
          </P>
        </Section>

        <Section>
          <H2>Третьи стороны / Third Parties</H2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                <th style={{ textAlign: 'left', padding: '8px 0', color: 'var(--color-text-muted)', fontWeight: 600 }}>Сервис</th>
                <th style={{ textAlign: 'left', padding: '8px 8px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Цель</th>
                <th style={{ textAlign: 'left', padding: '8px 0', color: 'var(--color-text-muted)', fontWeight: 600 }}>Политика</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Telegram', purpose: 'Авторизация и уведомления', policy: 'telegram.org/privacy' },
                { name: 'Supabase', purpose: 'Хранение данных (БД)', policy: 'supabase.com/privacy' },
                { name: 'Vercel', purpose: 'Хостинг и CDN', policy: 'vercel.com/legal/privacy-policy' },
              ].map((row) => (
                <tr key={row.name} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <td style={{ padding: '8px 0', color: 'var(--color-text-primary)', fontWeight: 600 }}>{row.name}</td>
                  <td style={{ padding: '8px 8px', color: 'var(--color-text-secondary)' }}>{row.purpose}</td>
                  <td style={{ padding: '8px 0' }}>
                    <a href={`https://${row.policy}`} style={{ color: 'var(--color-neon)', fontSize: 11 }} target="_blank" rel="noopener noreferrer">
                      {row.policy}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section>
          <H2>Ваши права / Your Rights</H2>
          <P>Вы имеете право:</P>
          <ul style={{ paddingLeft: 20, margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Li><b>Доступ</b> — запросить все данные, которые мы о вас храним.</Li>
            <Li><b>Удаление</b> — запросить полное удаление аккаунта и всех данных. Для этого: используйте кнопку «Удалить аккаунт» в Настройках приложения, либо напишите команду /delete_data боту, либо свяжитесь с нами @by_arto.</Li>
            <Li><b>Исправление</b> — все данные подписок вы редактируете напрямую в приложении.</Li>
            <Li><b>Переносимость</b> — используйте экспорт CSV/JSON в Настройках → Данные.</Li>
          </ul>
          <P>
            <b>You have the right to:</b> access your data; delete your account and all data
            (use «Delete Account» in Settings, send /delete_data to the bot, or contact @by_arto);
            correct your data directly in the app; export via CSV/JSON in Settings → Data.
          </P>
          <P>
            Мы удалим ваши данные без лишних задержек по вашему запросу.
            We will delete your data without undue delay upon request.
          </P>
          <P>
            <b>California residents (CCPA):</b> You have the right to request disclosure of the
            categories and specific pieces of personal data we have collected about you, and the
            right to request deletion. Contact @by_arto on Telegram to exercise these rights.
          </P>
        </Section>

        <Section>
          <H2>Безопасность / Security</H2>
          <P>
            Данные хранятся в Supabase с шифрованием в состоянии покоя. Доступ к данным
            защищён политиками Row Level Security (RLS) — каждый пользователь видит только
            свои данные. Все соединения используют HTTPS/TLS.
          </P>
          <P>
            Data is stored in Supabase with encryption at rest. Access is protected by Row Level
            Security (RLS) — each user sees only their own data. All connections use HTTPS/TLS.
          </P>
        </Section>

        <Section>
          <H2>Дети / Children</H2>
          <P>
            SubEasy не предназначен для лиц младше 13 лет. Мы осознанно не собираем данные
            детей до 13 лет. Возрастные ограничения Telegram применяются автоматически.
          </P>
          <P>
            SubEasy is not intended for children under 13. We do not knowingly collect data from
            children under 13. Telegram&apos;s age restrictions apply automatically.
          </P>
        </Section>

        <Section>
          <H2>Изменения политики / Policy Changes</H2>
          <P>
            При существенных изменениях мы уведомим пользователей через бота или в интерфейсе
            приложения. Дата «Последнее обновление» всегда актуальна.
          </P>
          <P>
            For material changes we will notify users via the bot or in-app. The &quot;Last updated&quot;
            date is always current.
          </P>
        </Section>

        <Section>
          <H2>Контакт / Contact</H2>
          <P>
            По вопросам конфиденциальности и запросам на удаление данных:{' '}
            <a href="https://t.me/by_arto" style={{ color: 'var(--color-neon)' }} target="_blank" rel="noopener noreferrer">
              @by_arto
            </a>{' '}
            в Telegram.
          </P>
          <P>
            For privacy questions and data deletion requests:{' '}
            <a href="https://t.me/by_arto" style={{ color: 'var(--color-neon)' }} target="_blank" rel="noopener noreferrer">
              @by_arto
            </a>{' '}
            on Telegram.
          </P>
        </Section>

        <div
          style={{
            marginTop: 32,
            padding: '16px',
            background: 'color-mix(in srgb, var(--color-neon) 4%, transparent)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 12,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 20, marginBottom: 8 }}>🛡️</div>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
            Ваши данные — ваши. Мы храним только то, что нужно для работы сервиса.<br />
            Your data is yours. We only store what&apos;s needed to run the service.
          </p>
        </div>

      </div>
    </div>
  );
}

/* ── Local helpers ── */

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginBottom: 28,
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 16,
        padding: '16px 18px',
      }}
    >
      {children}
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 13,
        fontWeight: 800,
        color: 'var(--color-neon)',
        margin: '0 0 10px',
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 13,
        color: 'var(--color-text-secondary)',
        lineHeight: 1.65,
        margin: '0 0 8px',
      }}
    >
      {children}
    </p>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
      {children}
    </li>
  );
}
