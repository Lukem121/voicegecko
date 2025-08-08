import { Card } from '@acme/ui/components/ui/card';

const ENTRIES = [
  {
    date: '2025-08-01',
    title: 'Faster transcription pipeline',
    items: [
      'Improved average transcript latency by ~20%',
      'Added privacy mode indicator to recorder',
    ],
  },
  {
    date: '2025-07-24',
    title: 'Personal dictionary enhancements',
    items: ['Bulk import, export to CSV', 'Better matching for proper nouns'],
  },
];

export default function ChangelogPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="text-center">
        <h1 className="font-bold text-4xl tracking-tight md:text-5xl">
          Changelog
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Highlights from recent releases.
        </p>
      </header>
      <section className="mt-10 grid gap-4">
        {ENTRIES.map((e) => (
          <Card className="p-6" key={e.date}>
            <p className="text-muted-foreground text-xs">{e.date}</p>
            <p className="mt-1 font-semibold">{e.title}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {e.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          </Card>
        ))}
      </section>
    </main>
  );
}
