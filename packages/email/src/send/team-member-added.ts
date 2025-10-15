export function sendTeamMemberAddedEmail(_params: {
  to: string;
  ownerName?: string | null;
  teamName?: string | null;
  ctaUrl: string;
}) {
  // Placeholder: integrate with your email delivery (Resend/SES/etc.) similar to other senders
  // For now, this is a no-op to keep MVP simple.
  // await emailClient.send({
  //   to: params.to,
  //   subject: `You've been added to a team on VoiceGecko`,
  //   react: TeamMemberAddedEmail({
  //     ownerName: params.ownerName,
  //     teamName: params.teamName,
  //     ctaUrl: params.ctaUrl,
  //   }),
  // });

  return { success: true } as const;
}
