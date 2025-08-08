import { Card } from '@acme/ui/components/ui/card';
import type { Metadata } from 'next';
import { BENEFITS, FAQS, ROLES, VALUES } from './data';
import { Roles } from './Roles';

export const metadata: Metadata = {
  title: 'Careers — Voice Gecko',
  description:
    'Help shape voice‑first computing. See open roles across engineering, design, and go‑to‑market.',
  openGraph: {
    title: 'Careers — Voice Gecko',
    description:
      'Help shape voice‑first computing. See open roles across engineering, design, and go‑to‑market.',
  },
};

export default function CareersPage() {
  // Server entry; interactive bits are in client components
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      {/* Hero */}
      <header className="mx-auto max-w-3xl text-center">
        <p className="font-medium text-primary">Careers</p>
        <h1 className="mt-2 font-bold text-4xl tracking-tight md:text-5xl">
          Build the fastest path from ideas to outcomes
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          We’re a small, senior team building voice‑first tools used every day
          to move work forward. If you love crisp UX, pragmatic engineering, and
          shipping—come build with us.
        </p>
      </header>

      {/* Highlights */}
      <section className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          {
            k: 'Remote‑first',
            v: 'Work from anywhere (UTC‑1 to UTC+4 overlap)',
          },
          { k: 'Ownership', v: 'Meaningful equity & real product impact' },
          { k: 'Velocity', v: 'Ship fast, measure, iterate' },
        ].map((i) => (
          <Card className="p-6" key={i.k}>
            <p className="font-medium">{i.k}</p>
            <p className="mt-1 text-muted-foreground text-sm">{i.v}</p>
          </Card>
        ))}
      </section>

      {/* Values */}
      <section className="mt-16">
        <h2 className="font-semibold text-2xl">How we work</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {VALUES.map((v) => (
            <Card className="p-6" key={v.title}>
              <p className="font-medium">{v.title}</p>
              <p className="mt-2 text-muted-foreground text-sm">
                {v.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Tech & product */}
      <section className="mt-16">
        <h2 className="font-semibold text-2xl">Our stack</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <p className="font-medium">Product & Platform</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground text-sm">
              <li>Desktop: Tauri (Rust) + React</li>
              <li>Web: Next.js (App Router) + TypeScript</li>
              <li>API: tRPC, Drizzle, Postgres</li>
              <li>Payments: Stripe</li>
              <li>Observability: structured logs, tracing</li>
            </ul>
          </Card>
          <Card className="p-6">
            <p className="font-medium">Engineering principles</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground text-sm">
              <li>Ship to learn—iterate with real feedback</li>
              <li>Clarity over cleverness; accessible by default</li>
              <li>Measure performance; keep UI buttery‑smooth</li>
              <li>Ownership: you build it, you improve it</li>
            </ul>
          </Card>
        </div>
      </section>

      {/* Roles with search/filter & apply dialog */}
      <Roles roles={ROLES} />

      {/* Benefits, process, EEO */}
      <section className="mt-16 grid gap-6 md:grid-cols-3">
        {BENEFITS.map((b) => (
          <Card className="p-6" key={b.title}>
            <h3 className="font-semibold">{b.title}</h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {b.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          </Card>
        ))}
        <Card className="p-6">
          <h3 className="font-semibold">How we hire</h3>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
            <li>Intro chat (30 min)</li>
            <li>Role‑specific deep dive (60 min)</li>
            <li>Practical exercise or portfolio review</li>
            <li>Founder conversation</li>
            <li>Offer</li>
          </ol>
        </Card>
        <Card className="p-6 md:col-span-3">
          <h3 className="font-semibold">Equal Opportunity</h3>
          <p className="mt-3 text-muted-foreground text-sm">
            We’re an equal opportunity employer. We value diversity and are
            committed to creating an inclusive environment for all employees.
          </p>
        </Card>
      </section>

      {/* FAQs */}
      <section className="mt-16">
        <h2 className="font-semibold text-2xl">Hiring FAQs</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {FAQS.map((f) => (
            <Card className="p-6" key={f.q}>
              <p className="font-medium">{f.q}</p>
              <p className="mt-1 text-muted-foreground text-sm">{f.a}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-16 rounded-xl border bg-muted/40 p-8 text-center">
        <p className="mx-auto max-w-2xl text-balance text-muted-foreground">
          Don’t see a perfect fit? Send a general application via our contact
          form and tell us how you can help.
        </p>
        <div className="mt-4 text-center">
          <a
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
            href="/contact"
          >
            Contact us
          </a>
        </div>
      </section>
    </main>
  );
}
