'use client';

import { UiTile } from '../components/cards';
import Section from '../components/section';

export default function UiSnapshotSection() {
  return (
    <Section surface surfaceClassName="p-10md:py-24" variant="diagonal">
      <h2 className="text-center font-bold text-2xl text-foreground tracking-tight md:text-3xl">
        Lightweight desktop UI
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground text-sm">
        Stays out of your way. Access from the system tray, speak, paste, and
        carry on.
      </p>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <UiTile
          body="One click to open the recorder and see status."
          pose="peek"
          title="Tray icon"
        />
        <UiTile
          body="Press the shortcut—watch the meter, say your piece."
          pose="run"
          title="Listening"
        />
        <UiTile
          body="In a blink, text is cleaned and copied to your clipboard."
          pose="float"
          title="Processing"
        />
      </div>
    </Section>
  );
}
