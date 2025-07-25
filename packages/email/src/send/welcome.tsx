import { sendEmail } from "../lib/send-email";
import { WelcomeTemplate } from "../templates/welcome";

type UserWithEmail = {
  email: string;
  name?: string;
};

export const sendWelcomeEmail = async ({
  user,
  downloadUrl,
}: {
  user: UserWithEmail;
  downloadUrl?: string;
}) => {
  await sendEmail({
    to: {
      email: user.email,
      name: user.name || "",
    },
    from: {
      email: "no-reply@voicegecko.io",
      name: "VoiceGecko",
    },
    categories: ["welcome"],
    subject: "Welcome to VoiceGecko - Your voice-to-text journey begins now!",
    react: <WelcomeTemplate name={user.name} downloadUrl={downloadUrl} />,
  });
};
