import { WelcomeTemplate } from '../templates/welcome';

export default function WelcomeEmail() {
  return (
    <WelcomeTemplate
      downloadUrl="https://www.voicegecko.io/downloads"
      name="John"
    />
  );
}
