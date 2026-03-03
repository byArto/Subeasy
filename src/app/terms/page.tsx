export const metadata = {
  title: 'Terms of Service — SubEasy',
  description: 'Terms of Service for SubEasy subscription tracker',
};

export default function TermsPage() {
  return (
    <div
      style={{
        height: '100vh',
        overflowY: 'auto',
        background: 'linear-gradient(to bottom, #0A0A0F, #07070C)',
        color: '#F0F0F5',
        fontFamily: "'Montserrat', sans-serif",
        padding: '0 0 60px',
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: '1px solid rgba(0,255,65,0.08)',
          padding: '20px 20px 16px',
          position: 'sticky',
          top: 0,
          background: '#0A0A0F',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 640, margin: '0 auto' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'rgba(245,200,66,0.1)',
              border: '1.5px solid rgba(245,200,66,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
            }}
          >
            📋
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F0F0F5' }}>SubEasy</div>
            <div style={{ fontSize: 11, color: '#55556A' }}>Terms of Service · Условия использования</div>
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
            background: 'rgba(245,200,66,0.06)',
            border: '1px solid rgba(245,200,66,0.15)',
            borderRadius: 8,
            padding: '4px 12px',
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 10, color: '#f5c842', fontWeight: 700, letterSpacing: '0.06em' }}>
            Последнее обновление / Last updated: 2 марта 2026
          </span>
        </div>

        <Section>
          <H2>1. О сервисе / About the Service</H2>
          <P>
            SubEasy — трекер подписок для физических лиц, доступный как Telegram Mini App и PWA.
            Сервис разработан и поддерживается независимым разработчиком.
          </P>
          <P>
            SubEasy is a personal subscription tracker available as a Telegram Mini App and PWA,
            developed and maintained by an independent developer.
          </P>
          <P>
            Используя SubEasy, вы соглашаетесь с настоящими Условиями. Если вы не согласны —
            пожалуйста, прекратите использование сервиса.
          </P>
          <P>
            By using SubEasy you agree to these Terms. If you disagree, please discontinue use.
          </P>
        </Section>

        <Section>
          <H2>2. Учётная запись / Account</H2>
          <P>
            Для использования SubEasy требуется аккаунт Telegram (через Telegram Mini App) или
            Supabase Auth (через PWA). Вы несёте ответственность за безопасность своего аккаунта.
          </P>
          <P>
            You need a Telegram account (via Mini App) or Supabase Auth (via PWA). You are
            responsible for your account security.
          </P>
        </Section>

        <Section>
          <H2>3. Подписка PRO / PRO Subscription</H2>
          <P>SubEasy предлагает бесплатный план и платный план PRO.</P>

          <div style={{ margin: '10px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { plan: 'Месяц / Monthly', stars: '249 ⭐' },
              { plan: 'Год / Yearly', stars: '1 799 ⭐' },
              { plan: 'Навсегда / Lifetime', stars: '2 999 ⭐' },
            ].map((row) => (
              <div
                key={row.plan}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#1A1A24',
                  borderRadius: 10,
                  padding: '10px 14px',
                }}
              >
                <span style={{ fontSize: 13, color: '#F0F0F5', fontWeight: 600 }}>{row.plan}</span>
                <span style={{ fontSize: 14, color: '#f5c842', fontWeight: 800 }}>{row.stars}</span>
              </div>
            ))}
          </div>

          <P>
            Оплата производится через <b>Telegram Stars</b> — официальную платёжную систему Telegram.
            Мы не обрабатываем и не храним данные банковских карт.
          </P>
          <P>
            Payment is processed via <b>Telegram Stars</b> — Telegram's official payment system.
            We do not process or store bank card details.
          </P>
          <P>
            PRO активируется мгновенно после успешной оплаты. Годовой и месячный планы
            автоматически не продлеваются — вы выбираете продление вручную.
          </P>
          <P>
            PRO is activated instantly after successful payment. Monthly and yearly plans do not
            auto-renew — you choose to renew manually.
          </P>
        </Section>

        <Section>
          <H2>4. Возвраты / Refunds</H2>
          <P>
            Возвраты Stars рассматриваются индивидуально. Если PRO не был активирован после
            оплаты по техническим причинам — напишите нам @by_arto, мы разберёмся.
          </P>
          <P>
            По вопросам оплаты вы также можете обратиться напрямую к Telegram через команду
            /paysupport в боте.
          </P>
          <P>
            Refunds of Stars are handled on a case-by-case basis. If PRO was not activated after
            payment due to a technical issue — contact us @by_arto. You may also contact Telegram
            directly via /paysupport in the bot.
          </P>
        </Section>

        <Section>
          <H2>5. Что входит в PRO / What's Included in PRO</H2>
          <ul style={{ paddingLeft: 20, margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Li>Семейный план (Shared Workspace) — до 6 участников.</Li>
            <Li>Telegram-уведомления за 1–7 дней до списания.</Li>
            <Li>Бюджетный лимит с прогресс-баром.</Li>
            <Li>Новые цветовые палитры (темы).</Li>
            <Li>PDF / CSV экспорт данных.</Li>
            <Li>AI-аудит портфеля (в разработке).</Li>
          </ul>
          <P>
            Мы оставляем за собой право добавлять новые PRO-функции и изменять набор
            бесплатных функций с предварительным уведомлением.
          </P>
          <P>
            We reserve the right to add new PRO features and adjust the free tier with prior notice.
          </P>
        </Section>

        <Section>
          <H2>6. Обязанности пользователя / User Obligations</H2>
          <P>Используя SubEasy, вы обязуетесь:</P>
          <ul style={{ paddingLeft: 20, margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Li>Не нарушать применимое законодательство.</Li>
            <Li>Не пытаться обойти ограничения или получить несанкционированный доступ к данным других пользователей.</Li>
            <Li>Не использовать сервис для автоматизированного сбора данных или спама.</Li>
            <Li>Соблюдать Условия использования Telegram.</Li>
          </ul>
          <P>
            By using SubEasy you agree not to violate applicable law; not to attempt to bypass
            restrictions or access other users' data; not to use the service for automated data
            collection or spam; to comply with Telegram's Terms of Service.
          </P>
        </Section>

        <Section>
          <H2>7. Ограничение ответственности / Limitation of Liability</H2>
          <P>
            SubEasy предоставляется «как есть» (as is). Мы не гарантируем бесперебойную
            работу сервиса и не несём ответственности за финансовые решения, принятые
            на основе данных приложения. Данные о подписках вводятся пользователем вручную
            и не являются финансовым советом.
          </P>
          <P>
            SubEasy is provided "as is". We do not guarantee uninterrupted service and are not
            liable for financial decisions made based on app data. Subscription data is entered
            manually by users and does not constitute financial advice.
          </P>
          <P>
            В максимально допустимой законом мере наша ответственность ограничена суммой,
            уплаченной вами за PRO в течение последних 12 месяцев.
          </P>
          <P>
            To the maximum extent permitted by law, our liability is limited to the amount you paid
            for PRO in the last 12 months.
          </P>
        </Section>

        <Section>
          <H2>8. Прекращение работы / Service Termination</H2>
          <P>
            Мы оставляем за собой право приостановить или прекратить работу сервиса с
            предварительным уведомлением через бота или интерфейс приложения. Нарушение
            настоящих Условий может повлечь немедленное прекращение доступа.
          </P>
          <P>
            We reserve the right to suspend or terminate the service with prior notice via bot
            or in-app. Violation of these Terms may result in immediate access termination.
          </P>
        </Section>

        <Section>
          <H2>9. Изменения условий / Changes to Terms</H2>
          <P>
            При существенных изменениях мы уведомим пользователей через Telegram-бота.
            Продолжение использования сервиса означает принятие обновлённых условий.
          </P>
          <P>
            For material changes we will notify users via the Telegram bot. Continued use of the
            service constitutes acceptance of the updated Terms.
          </P>
        </Section>

        <Section>
          <H2>10. Применимое право / Governing Law</H2>
          <P>
            Споры разрешаются путём переговоров. При невозможности — в соответствии с
            законодательством, применимым к месту нахождения разработчика.
          </P>
          <P>
            Disputes are resolved through negotiation. If not possible — in accordance with
            the law applicable to the developer's jurisdiction.
          </P>
        </Section>

        <Section>
          <H2>11. Контакт / Contact</H2>
          <P>
            По любым вопросам, связанным с условиями использования:{' '}
            <a href="https://t.me/by_arto" style={{ color: '#f5c842' }} target="_blank" rel="noopener noreferrer">
              @by_arto
            </a>{' '}
            в Telegram.
          </P>
          <P>
            For any questions regarding these Terms:{' '}
            <a href="https://t.me/by_arto" style={{ color: '#f5c842' }} target="_blank" rel="noopener noreferrer">
              @by_arto
            </a>{' '}
            on Telegram.
          </P>
        </Section>

        {/* Links to other docs */}
        <div
          style={{
            marginTop: 8,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <a
            href="/privacy"
            style={{
              flex: 1,
              minWidth: 140,
              background: 'rgba(0,255,65,0.06)',
              border: '1px solid rgba(0,255,65,0.12)',
              borderRadius: 12,
              padding: '14px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>🔒</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#00FF41' }}>Privacy Policy</div>
              <div style={{ fontSize: 11, color: '#55556A' }}>subeasy.org/privacy</div>
            </div>
          </a>
          <a
            href="https://telegram.org/tos/mini-apps"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              minWidth: 140,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
              padding: '14px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>✈️</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#F0F0F5' }}>Telegram Mini Apps ToS</div>
              <div style={{ fontSize: 11, color: '#55556A' }}>telegram.org/tos/mini-apps</div>
            </div>
          </a>
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
        background: '#111118',
        border: '1px solid rgba(0,255,65,0.06)',
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
        color: '#f5c842',
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
        color: '#8888A0',
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
    <li style={{ fontSize: 13, color: '#8888A0', lineHeight: 1.6 }}>
      {children}
    </li>
  );
}
