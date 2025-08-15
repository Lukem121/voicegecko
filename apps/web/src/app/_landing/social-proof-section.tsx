import {
  SiDiscord,
  SiGithub,
  SiJirasoftware,
  SiSlack,
  SiTelegram,
} from 'react-icons/si';
import { VscCode } from 'react-icons/vsc';
import Eyebrow from './eyebrow';
import SectionWrapper from './section-wrapper';

export default function SocialProofSection() {
  return (
    <SectionWrapper className="max-w-7xl py-0">
      <div className="mt-10 text-center text-muted-foreground text-xs md:text-sm">
        <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span>Loved by 2,000+ users</span>
          <span
            aria-hidden
            className="hidden h-1.5 w-1.5 rounded-full bg-gray-300 md:inline-block"
          />
          <span>10,000+ hours transcribed</span>
        </p>
        <Eyebrow className="mt-2">
          WORKS ACROSS VIRTUALLY ANY DESKTOP APP
        </Eyebrow>
      </div>
      <ul className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-foreground/80 md:gap-x-8">
        <li className="inline-flex items-center gap-2 text-sm">
          <SiSlack aria-hidden className="h-4 w-4" />
          <span>Slack</span>
        </li>
        <li className="inline-flex items-center gap-2 text-sm">
          <SiJirasoftware aria-hidden className="h-4 w-4" />
          <span>Jira</span>
        </li>
        <li className="inline-flex items-center gap-2 text-sm">
          <SiDiscord aria-hidden className="h-4 w-4" />
          <span>Discord</span>
        </li>
        <li className="inline-flex items-center gap-2 text-sm">
          <SiGithub aria-hidden className="h-4 w-4" />
          <span>GitHub</span>
        </li>
        <li className="inline-flex items-center gap-2 text-sm">
          <VscCode aria-hidden className="h-4 w-4" />
          <span>VS Code</span>
        </li>
        <li className="inline-flex items-center gap-2 text-sm">
          <SiTelegram aria-hidden className="h-4 w-4" />
          <span>Telegram</span>
        </li>
      </ul>
    </SectionWrapper>
  );
}
