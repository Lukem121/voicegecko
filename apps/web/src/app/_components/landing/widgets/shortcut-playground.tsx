'use client';

import { cn } from '@acme/ui/lib/utils';
import { motion } from 'framer-motion';
import React from 'react';
import { HiSparkles } from 'react-icons/hi';

export default function ShortcutPlayground() {
  const [phase, setPhase] = React.useState<'idle' | 'listening' | 'done'>(
    'idle'
  );
  const [hint, setHint] = React.useState<string>(
    'Press ⊞ Win+Shift+G to try it'
  );
  const [typed, setTyped] = React.useState('');
  const [wave, setWave] = React.useState(0);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isWindowsCombo =
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        (e.key.toLowerCase() === 'g' || e.code === 'KeyG');
      if (isWindowsCombo) {
        e.preventDefault();
        setPhase('listening');
        setHint('Listening… speak your thought');
        // lightweight waveform tick while listening
        const waveId = setInterval(() => {
          setWave((w) => (w + 1) % 12);
        }, 80);
        setTimeout(() => {
          setPhase('done');
          setHint('Transcribed! Copied to clipboard');
          clearInterval(waveId);
          // Simulate auto-typing for the demo output
          const output = [
            '• Summary of sprint\n',
            '• Blockers highlighted\n',
            '• Owners assigned with next steps',
          ];
          let idx = 0;
          setTyped('');
          const interval = setInterval(() => {
            setTyped((prev) => prev + output[idx]);
            idx += 1;
            if (idx >= output.length) {
              clearInterval(interval);
            }
          }, 120);
        }, 900);
        setTimeout(() => {
          setPhase('idle');
          setHint('Press ⊞ Win+Shift+G to try it');
        }, 2200);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  let statusText: string;
  switch (phase) {
    case 'idle':
      statusText = 'Idle';
      break;
    case 'listening':
      statusText = 'Listening';
      break;
    default:
      statusText = 'Transcribed';
  }

  const statusDotClass = phase === 'idle' ? 'bg-border' : 'bg-primary';

  return (
    <motion.div
      className="rounded-2xl border border-border bg-card p-6"
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      viewport={{ once: true }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <h3 className="font-semibold text-card-foreground text-lg tracking-tight">
        Try the shortcut
      </h3>
      <p className="mt-1 text-muted-foreground text-sm">
        Press{' '}
        <kbd className="rounded border border-border bg-muted px-1 text-card-foreground">
          ⊞
        </kbd>{' '}
        <span className="mx-1">+</span>
        <kbd className="rounded border border-border bg-muted px-1 text-card-foreground">
          Shift
        </kbd>{' '}
        <span className="mx-1">+</span>
        <kbd className="rounded border border-border bg-muted px-1 text-card-foreground">
          G
        </kbd>
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted p-3">
          <p className="font-semibold text-[12px] text-muted-foreground">
            Status
          </p>
          <div className="mt-2 flex items-center gap-2 text-[12px]">
            <span
              className={cn(
                'inline-block h-2 w-2 rounded-full',
                statusDotClass
              )}
            />
            <span className="font-medium text-card-foreground">
              {statusText}
            </span>
          </div>
          {phase === 'listening' && (
            <div className="mt-3 flex h-8 items-end gap-1">
              {Array.from({ length: 16 }).map((_, i) => (
                <motion.span
                  animate={{ height: `${10 + ((i + wave) % 6) * 6}px` }}
                  className="w-1 rounded-sm bg-primary/70"
                  key={`wave-${(i * 7) % 17}`}
                  transition={{ duration: 0.2 }}
                />
              ))}
            </div>
          )}
          <output
            aria-live="polite"
            className="mt-3 rounded-md border border-border border-dashed bg-background p-2 text-[12px] text-muted-foreground"
          >
            {hint}
          </output>
        </div>
        <div className="rounded-lg border border-accent bg-accent p-3">
          <p className="font-semibold text-[12px] text-accent-foreground">
            Clipboard Output (demo)
          </p>
          <div className="mt-1 min-h-14 text-[12px] text-accent-foreground">
            {phase === 'idle' && (
              <span className="opacity-60">Your text will appear here…</span>
            )}
            {phase === 'listening' && (
              <span className="opacity-80">"Let's draft sprint notes…"</span>
            )}
            {phase === 'done' && (
              <pre className="whitespace-pre-wrap text-[12px]">{typed}</pre>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted p-3">
          <p className="font-semibold text-[12px] text-muted-foreground">
            Try pasting
          </p>
          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
            <input
              aria-label="Paste here"
              className="rounded-md border border-border bg-background px-2 py-1 text-[12px]"
              placeholder="Ctrl+V to paste"
            />
            <button
              className="rounded-md bg-primary px-2.5 py-1 font-medium text-[12px] text-primary-foreground"
              onClick={() => {
                navigator.clipboard.writeText(
                  '• Summary of sprint\n• Blockers highlighted\n• Owners assigned with next steps'
                );
              }}
              type="button"
            >
              Copy
            </button>
          </div>
          <p className="mt-2 text-[12px] text-muted-foreground">
            Copy places the demo text on your clipboard. Paste anywhere.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted p-3">
          <p className="font-semibold text-[12px] text-muted-foreground">
            Auto‑type (demo)
          </p>
          <p className="mt-2 text-[12px] text-muted-foreground">
            Placeholder: animated keystrokes could preview auto‑typing.
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-muted-foreground text-xs">
        <HiSparkles className="h-4 w-4 text-primary" />
        <span>This is a playful demo—no mic required.</span>
      </div>
    </motion.div>
  );
}
