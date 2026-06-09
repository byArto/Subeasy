export const metadata = {
  title: 'Удаление аккаунта и данных — SubEasy',
  description: 'Как удалить аккаунт SubEasy и связанные с ним данные / How to delete your SubEasy account and data',
};

export default function AccountDeletionPage() {
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
            🗑️
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>SubEasy</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Удаление аккаунта · Account deletion</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px 0' }}>

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
            SubEasy — трекер подписок / subscription tracker
          </span>
        </div>

        <Section>
          <H2>Удалить аккаунт / Delete your account</H2>
          <P>Вы можете удалить свой аккаунт SubEasy и все связанные с ним данные прямо в приложении:</P>
          <ol style={{ paddingLeft: 20, margin: '8px 0 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Li>Откройте приложение SubEasy.</Li>
            <Li>Перейдите на вкладку <b>«Настройки»</b>.</Li>
            <Li>Прокрутите вниз до раздела аккаунта и нажмите <b>«Удалить аккаунт»</b>.</Li>
            <Li>Подтвердите удаление — аккаунт и связанные данные будут удалены безвозвратно.</Li>
          </ol>
          <P>You can delete your SubEasy account and all associated data from within the app: open SubEasy → <b>Settings</b> → scroll to the account section → <b>Delete account</b> → confirm.</P>
        </Section>

        <Section>
          <H2>Удалить часть данных / Delete part of your data</H2>
          <P>
            Без удаления аккаунта вы можете удалить отдельные данные: откройте любую подписку и
            нажмите «Удалить» — она будет удалена с устройства и из синхронизации.
          </P>
          <P>
            Without deleting your account, you can remove individual data: open any subscription
            and tap «Delete» — it is removed from the device and from sync.
          </P>
        </Section>

        <Section>
          <H2>Не можете войти? / Can&apos;t access the app?</H2>
          <P>
            Напишите нам в Telegram <b>@by_arto</b> с темой «Удаление аккаунта» и укажите email,
            на который зарегистрирован аккаунт. Мы обработаем запрос в течение 30 дней.
          </P>
          <P>
            Contact us on Telegram <b>@by_arto</b> with the subject «Account deletion» and the email
            your account is registered with. We will process the request within 30 days.
          </P>
        </Section>

        <Section>
          <H2>Какие данные удаляются / What gets deleted</H2>
          <P>При удалении аккаунта безвозвратно удаляются:</P>
          <ul style={{ paddingLeft: 20, margin: '8px 0 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Li>email и идентификатор аккаунта;</Li>
            <Li>все ваши подписки, категории и настройки, хранящиеся на сервере;</Li>
            <Li>участие в совместных пространствах.</Li>
          </ul>
          <P>
            <b>Что не хранится у нас:</b> данные, сохранённые только локально на вашем устройстве
            (localStorage), удаляются при удалении приложения или очистке его данных и на наши
            серверы не передаются.
          </P>
          <P>
            <b>Сроки:</b> данные аккаунта удаляются сразу при удалении в приложении или в течение
            30 дней при запросе. Технические журналы сервера хранятся не дольше 90 дней. Мы не
            храним персональные данные после удаления, кроме случаев, предусмотренных законом.
          </P>
          <P>
            When you delete your account we permanently remove your email/account identifier, all
            server-stored subscriptions, categories and settings, and workspace memberships. Data
            stored only locally on your device never reaches our servers. Account data is deleted
            immediately (in-app) or within 30 days (by request); transient server logs are kept no
            longer than 90 days.
          </P>
        </Section>

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
