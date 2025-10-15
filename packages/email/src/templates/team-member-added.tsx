type TeamMemberAddedEmailProps = {
  ownerName?: string | null;
  teamName?: string | null;
  ctaUrl: string;
};

export function TeamMemberAddedEmail({
  ownerName,
  teamName,
  ctaUrl,
}: TeamMemberAddedEmailProps) {
  return (
    <div
      style={{
        fontFamily:
          'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        color: '#111827',
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ fontSize: 20, margin: '0 0 12px' }}>
        You’ve been added to a team
      </h1>
      <p style={{ margin: '0 0 12px' }}>
        {ownerName ? `${ownerName} ` : ''}
        has added you {teamName ? `to the team “${teamName}”` : 'to their team'}{' '}
        on VoiceGecko.
      </p>
      <p style={{ margin: '0 0 16px' }}>
        You now have access to the paid features under this team’s subscription.
      </p>
      <p style={{ margin: '0 0 20px' }}>
        <a
          href={ctaUrl}
          style={{
            backgroundColor: '#16a34a',
            color: 'white',
            padding: '10px 16px',
            borderRadius: 6,
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Get started
        </a>
      </p>
      <p style={{ fontSize: 12, color: '#6b7280' }}>
        If you didn’t expect this, you can ignore this email.
      </p>
    </div>
  );
}
