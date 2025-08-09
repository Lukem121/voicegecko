import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@acme/ui/components/stepper-vertical';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@acme/ui/components/ui/accordion';
import { Badge } from '@acme/ui/components/ui/badge';
import { Button } from '@acme/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import {
  ArrowRight,
  Briefcase,
  Check,
  GraduationCap,
  Heart,
  Laptop,
  MapPin,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';

export default function CareersPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-24">
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="mb-4" variant="secondary">
            <Sparkles className="size-3" /> We are hiring
          </Badge>
          <h1 className="font-semibold text-4xl leading-tight tracking-tight md:text-5xl">
            Build the future of voice productivity
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            Join VoiceGecko to craft fast, reliable transcription and assistive
            tooling that empowers everyone to work smarter.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" type="button">
              <Link href="#open-roles">
                See open roles
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" type="button" variant="outline">
              <Link href="#culture">Learn about working here</Link>
            </Button>
          </div>
        </div>
      </section>
      <section aria-labelledby="values-heading" className="py-8 md:py-12">
        <h2
          className="text-center font-semibold text-2xl tracking-tight md:text-3xl"
          id="values-heading"
        >
          What we value
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground">
          Principles that keep us focused on what matters most.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <ValueCard icon={<Users className="size-4" />} title="Ownership">
            We favor autonomy and accountability. Ship, iterate, and improve.
          </ValueCard>
          <ValueCard icon={<Laptop className="size-4" />} title="Craftsmanship">
            We sweat the details, from accessibility to performance.
          </ValueCard>
          <ValueCard
            icon={<Heart className="size-4" />}
            title="Customer empathy"
          >
            We talk to users often. Their problems guide our roadmap.
          </ValueCard>
          <ValueCard
            icon={<GraduationCap className="size-4" />}
            title="Learning"
          >
            We invest in growth, feedback, and continuous improvement.
          </ValueCard>
          <ValueCard icon={<Shield className="size-4" />} title="Trust">
            Privacy, reliability, and security are non‑negotiable.
          </ValueCard>
          <ValueCard icon={<Sparkles className="size-4" />} title="Simplicity">
            Clear, intuitive product experiences beat complexity.
          </ValueCard>
        </div>
      </section>
      <section aria-labelledby="benefits-heading" className="py-8 md:py-12">
        <h2
          className="text-center font-semibold text-2xl tracking-tight md:text-3xl"
          id="benefits-heading"
        >
          Benefits & perks
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground">
          We support great work and a healthy, flexible lifestyle.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <BenefitCard
            icon={<Heart className="size-4" />}
            title="Health coverage"
          >
            Comprehensive plans for eligible regions.
          </BenefitCard>
          <BenefitCard
            icon={<Laptop className="size-4" />}
            title="Remote stipend"
          >
            Budget for your home office and tools.
          </BenefitCard>
          <BenefitCard
            icon={<GraduationCap className="size-4" />}
            title="Learning budget"
          >
            Courses, books, and conference support.
          </BenefitCard>
          <BenefitCard
            icon={<Shield className="size-4" />}
            title="Parental leave"
          >
            Inclusive policies to support families.
          </BenefitCard>
          <BenefitCard
            icon={<Sparkles className="size-4" />}
            title="Flexible time off"
          >
            Take the time you need to recharge.
          </BenefitCard>
          <BenefitCard
            icon={<Users className="size-4" />}
            title="Async-friendly"
          >
            Pragmatic processes for global teams.
          </BenefitCard>
        </div>
      </section>
      <section
        aria-labelledby="roles-heading"
        className="py-8 md:py-12"
        id="open-roles"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2
              className="font-semibold text-2xl tracking-tight md:text-3xl"
              id="roles-heading"
            >
              Open roles
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Don’t see the perfect fit? Reach out anyway — we hire exceptional
              people.
            </p>
          </div>
          <Button asChild type="button" variant="outline">
            <Link href="#faq">Hiring FAQ</Link>
          </Button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {ROLES.map((role) => (
            <Card key={`${role.team}-${role.title}`}>
              <CardHeader className="border-border border-b">
                <CardTitle className="text-lg">{role.title}</CardTitle>
                <CardDescription>
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      <Briefcase aria-hidden="true" className="mr-1 size-3" />{' '}
                      {role.team}
                    </Badge>
                    <Badge variant="outline">
                      <MapPin aria-hidden="true" className="mr-1 size-3" />{' '}
                      {role.location}
                    </Badge>
                    <Badge variant="secondary">{role.type}</Badge>
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  {role.description}
                </p>
              </CardContent>
              <CardFooter>
                <div className="flex w-full items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <Check aria-hidden="true" className="size-3.5" />
                    <span>Rapid interviews · Clear feedback</span>
                  </div>
                  <Button asChild size="sm" type="button">
                    <Link href={role.url ?? '/contact'}>
                      Apply now
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
      <section aria-labelledby="process-heading" className="py-8 md:py-12">
        <h2
          className="text-center font-semibold text-2xl tracking-tight md:text-3xl"
          id="process-heading"
        >
          Our hiring process
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground">
          Transparent, respectful, and quick. We value your time.
        </p>
        <div className="mx-auto mt-8 max-w-3xl">
          <Stepper className="w-full" defaultValue={1} orientation="vertical">
            {[
              {
                step: 1,
                title: 'Intro & alignment',
                description:
                  '30 minutes with our team to learn about you and the role.',
              },
              {
                step: 2,
                title: 'Deep dive',
                description:
                  'Role-focused conversation on experience, product thinking, and collaboration.',
              },
              {
                step: 3,
                title: 'Practical exercise',
                description:
                  'Time‑boxed task reflecting real work. No gotchas, no whiteboard puzzles.',
              },
              {
                step: 4,
                title: 'Meet the team',
                description:
                  'Cross‑functional chats to understand ways of working and culture fit.',
              },
              {
                step: 5,
                title: 'Offer',
                description:
                  'We move fast with clear, competitive offers and growth paths.',
              },
            ].map(({ step, title, description }, _idx, arr) => (
              <StepperItem
                className="relative not-last:flex-1 items-start"
                key={step}
                step={step}
              >
                <StepperTrigger className="items-start rounded pb-12 last:pb-0">
                  <StepperIndicator />
                  <div className="mt-0.5 space-y-0.5 px-2 text-left">
                    <StepperTitle>{title}</StepperTitle>
                    <StepperDescription>{description}</StepperDescription>
                  </div>
                </StepperTrigger>
                {step < arr.length && (
                  <StepperSeparator className="-order-1 -translate-x-1/2 absolute inset-y-0 top-[calc(1.5rem+0.125rem)] left-3 m-0 group-data-[orientation=vertical]/stepper:h-[calc(100%-1.5rem-0.25rem)]" />
                )}
              </StepperItem>
            ))}
          </Stepper>
        </div>
      </section>
      <section aria-labelledby="faq-heading" className="py-8 md:py-12" id="faq">
        <h2
          className="text-center font-semibold text-2xl tracking-tight md:text-3xl"
          id="faq-heading"
        >
          Frequently asked questions
        </h2>
        <div className="mx-auto mt-6 max-w-3xl">
          <Accordion collapsible type="single">
            <AccordionItem value="remote">
              <AccordionTrigger>Are you remote‑first?</AccordionTrigger>
              <AccordionContent>
                Yes. We are remote‑first and async‑friendly, with teammates
                across time zones.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="visa">
              <AccordionTrigger>
                Do you provide visa sponsorship?
              </AccordionTrigger>
              <AccordionContent>
                In some regions and roles we can support sponsorship. Please
                apply and we’ll discuss specifics.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="interview">
              <AccordionTrigger>
                What does the interview process look like?
              </AccordionTrigger>
              <AccordionContent>
                A streamlined sequence: intro, deep dive, practical exercise,
                team chats, and offer. No trick puzzles.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="equipment">
              <AccordionTrigger>
                Do you provide work equipment?
              </AccordionTrigger>
              <AccordionContent>
                Yes. We offer a remote work stipend you can use for equipment
                and tools.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>
      <section className="rounded-2xl border border-border bg-card p-8 text-center md:p-12">
        <h2 className="font-semibold text-2xl tracking-tight md:text-3xl">
          Don’t see a role that fits?
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
          We love meeting talented people. Introduce yourself and we’ll be in
          touch when something opens up.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" type="button">
            <Link href="/contact">
              Get in touch
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" type="button" variant="outline">
            <Link href="#open-roles">Browse open roles</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

function ValueCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="gap-1">
        <div className="inline-flex items-center gap-2 text-muted-foreground text-xs">
          {icon}
          <span>{title}</span>
        </div>
        <CardTitle className="sr-only">{title}</CardTitle>
        <CardDescription className="sr-only">{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">{children}</p>
      </CardContent>
    </Card>
  );
}

type Role = {
  title: string;
  team: string;
  location: string;
  type: 'Full-time' | 'Contract' | 'Internship';
  description: string;
  url?: string;
};

const ROLES: Role[] = [
  {
    title: 'Senior Frontend Engineer',
    team: 'Engineering',
    location: 'Remote · Worldwide',
    type: 'Full-time',
    description:
      'Own core product surfaces, performance, and design systems. Ship fast with TypeScript, React 19, and Tailwind.',
  },
  {
    title: 'Product Designer (UX/UI)',
    team: 'Design',
    location: 'Remote · North America / EU',
    type: 'Full-time',
    description:
      'Lead end-to-end product design: workflows, prototypes, visuals. Partner with engineering to deliver delightful experiences.',
  },
];

function BenefitCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="gap-1">
        <div className="inline-flex items-center gap-2 text-muted-foreground text-xs">
          {icon}
          <span>{title}</span>
        </div>
        <CardTitle className="sr-only">{title}</CardTitle>
        <CardDescription className="sr-only">{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">{children}</p>
      </CardContent>
    </Card>
  );
}
