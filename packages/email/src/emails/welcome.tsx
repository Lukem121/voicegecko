import { WelcomeTemplate } from "../templates/welcome";

export default function WelcomeEmail() {
  return (
    <WelcomeTemplate
      name="John"
      downloadUrl="https://www.voicegecko.io/downloads"
    />
  );
}
