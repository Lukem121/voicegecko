import { sendEmail } from "../lib/send-email";
import { WelcomeProTemplate } from "../templates/welcome-pro";

type UserWithEmail = {
  email: string;
  name?: string;
};

export const sendWelcomeProEmail = async ({
  user,
  planName,
}: {
  user: UserWithEmail;
  planName: string;
  dashboardUrl?: string;
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
    categories: ["welcome_pro"],
    subject: `Welcome to ${planName} - Unlock the full power of voice-to-text!`,
    react: <WelcomeProTemplate name={user.name} planName={planName} />,
  });
};
