'use client';

import { motion } from 'framer-motion';
import { BiLogoVisualStudio } from 'react-icons/bi';
import { BsMicrosoftTeams } from 'react-icons/bs';
import { PiMicrosoftWordLogoFill } from 'react-icons/pi';
import {
  SiAsana,
  SiClickup,
  SiConfluence,
  SiFigma,
  SiGmail,
  SiGoogledocs,
  SiJirasoftware,
  SiLinear,
  SiNotion,
  SiObsidian,
  SiSlack,
  SiTodoist,
  SiTrello,
} from 'react-icons/si';
import AppIconRibbon from '../components/app-icon-ribbon';
import Section from '../components/section';

const apps = [
  { name: 'Notion', Icon: SiNotion },
  { name: 'Google Docs', Icon: SiGoogledocs },
  { name: 'Jira', Icon: SiJirasoftware },
  { name: 'Slack', Icon: SiSlack },
  { name: 'Gmail', Icon: SiGmail },
  { name: 'Linear', Icon: SiLinear },
  { name: 'Figma', Icon: SiFigma },
  { name: 'Asana', Icon: SiAsana },
  { name: 'ClickUp', Icon: SiClickup },
  { name: 'Trello', Icon: SiTrello },
  { name: 'Todoist', Icon: SiTodoist },
  { name: 'Obsidian', Icon: SiObsidian },
  { name: 'Confluence', Icon: SiConfluence },
  { name: 'VS Code', Icon: BiLogoVisualStudio },
  { name: 'Word', Icon: PiMicrosoftWordLogoFill },
  { name: 'Teams', Icon: BsMicrosoftTeams },
] as const;

export default function WorksEverywhereSection() {
  return (
    <Section className="rounded-3xl p-10md:py-24">
      <h2 className="text-center font-bold text-2xl text-foreground tracking-tight md:text-3xl">
        Paste anywhere you work
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground text-sm">
        Clipboard or auto‑type—Voice Gecko works across virtually any desktop
        app.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {apps.map((app, i) => (
          <motion.div
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
            initial={{ opacity: 0, y: 6 }}
            key={app.name}
            transition={{ duration: 0.25, delay: i * 0.03 }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-base text-foreground">
              <app.Icon className="h-4 w-4" />
            </span>
            <span className="font-medium text-card-foreground text-sm">
              {app.name}
            </span>
          </motion.div>
        ))}
      </div>
      <div className="mt-6">
        <AppIconRibbon />
      </div>
    </Section>
  );
}
