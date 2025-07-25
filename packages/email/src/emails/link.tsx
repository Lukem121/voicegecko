import { LinkTemplate } from "../templates/link";

export default function LinkEmail() {
  const url = "https://voicegecko.io/reset-password?token=12345678901234567890";

  return (
    <LinkTemplate
      heading="Reset your password"
      description="Your reset password link is below - click it to reset your password. This will redirect you back to VoiceGecko."
      url={url}
    />
  );
}
