import { sendEmail } from "../lib/send-email";
import LinkTemplate from "../templates/link";

type UserWithEmail = {
  email: string;
  name: string;
};

export const sendVerificationEmail = async ({
  user,
  url,
}: {
  user: UserWithEmail;
  url: string;
}) => {
  await sendEmail({
    to: {
      email: user.email,
      name: user.name,
    },
    from: {
      email: "no-reply@voicegecko.io",
      name: "VoiceGecko",
    },
    categories: ["verification"],
    subject: "Verify your email address",
    react: (
      <LinkTemplate
        heading="Verify your email address"
        description="Your verification link is below - click it to verify your email address. This will redirect you back to VoiceGecko."
        url={url}
      />
    ),
  });
};
