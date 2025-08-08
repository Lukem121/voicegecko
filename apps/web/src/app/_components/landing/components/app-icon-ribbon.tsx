'use client';

import Marquee from 'react-fast-marquee';
import { CgMonday } from 'react-icons/cg';
import {
  SiApple,
  SiBasecamp,
  SiBitbucket,
  SiBox,
  SiDiscord,
  SiDropbox,
  SiEvernote,
  SiFacebook,
  SiFigma,
  SiGithub,
  SiGmail,
  SiGooglecalendar,
  SiGoogledocs,
  SiGooglemeet,
  SiIntercom,
  SiJirasoftware,
  SiLinear,
  SiMiro,
  SiNotion,
  SiQuora,
  SiSlack,
  SiZendesk,
  SiZoom,
} from 'react-icons/si';

const icons = [
  // Existing 7
  { Icon: SiSlack, name: 'Slack' },
  { Icon: SiNotion, name: 'Notion' },
  { Icon: SiGoogledocs, name: 'Docs' },
  { Icon: SiJirasoftware, name: 'Jira' },
  { Icon: SiLinear, name: 'Linear' },
  { Icon: SiFigma, name: 'Figma' },
  { Icon: SiGmail, name: 'Gmail' },
  { Icon: SiDropbox, name: 'Dropbox' },
  { Icon: SiEvernote, name: 'Evernote' },
  { Icon: SiZoom, name: 'Zoom' },
  { Icon: SiGithub, name: 'GitHub' },
  { Icon: SiBitbucket, name: 'Bitbucket' },
  { Icon: SiZendesk, name: 'Zendesk' },
  { Icon: SiDiscord, name: 'Discord' },
  { Icon: SiGooglecalendar, name: 'Google Calendar' },
  { Icon: SiApple, name: 'Apple Notes' },
  { Icon: SiGooglemeet, name: 'Google Meet' },
  { Icon: SiMiro, name: 'Miro' },
  { Icon: SiQuora, name: 'Quora' },
  { Icon: SiBasecamp, name: 'Basecamp' },
  { Icon: SiBox, name: 'Box' },
  { Icon: CgMonday, name: 'Monday.com' },
  { Icon: SiIntercom, name: 'Intercom' },
  { Icon: SiFacebook, name: 'Facebook Workplace' },
] as const;

export default function AppIconRibbon() {
  const ribbonItems = icons.flatMap(({ Icon, name }) => [
    { Icon, name, id: `${name}-a` },
  ]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/60 to-transparent" />
      <Marquee autoFill gradient={false} speed={30}>
        <div className="flex gap-3 p-3">
          {ribbonItems.map(({ Icon, name, id }) => (
            <div
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-muted-foreground text-xs"
              key={id}
            >
              <span className="grid h-6 w-6 place-items-center rounded-md bg-background">
                <Icon className="h-3.5 w-3.5" />
              </span>
              {name}
            </div>
          ))}
        </div>
      </Marquee>
    </div>
  );
}
