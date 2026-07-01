import { Button } from '@acme/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@acme/ui/components/ui/card';
import { Input } from '@acme/ui/components/ui/input';
import { Skeleton } from '@acme/ui/components/ui/skeleton';
import {
  Calendar,
  Check,
  Clock,
  FileText,
  Mail,
  Plus,
  PlusCircle,
  Shield,
  TrendingUp,
  User2,
} from 'lucide-react';

import { PlanComparison } from '../plans/_components/plan-comparison';

const PRO_PLAN = {
  name: 'Pro',
  subtitle: 'All of our features',
  features: [
    'Unlimited dictations',
    'Advanced AI processing',
    'Export formats',
    'Priority support',
    'Cloud sync',
    'Advanced features',
  ],
  cta: 'Upgrade',
} as const;

const TEAM_PLAN = {
  name: 'Team',
  subtitle: 'Per seat pricing (min 3 seats)',
  features: [
    'Unlimited dictations (per seat)',
    'Invite team members',
    'Manage seats in billing portal',
  ],
  cta: 'Start Team Plan',
} as const;

function BillingToggleStatic() {
  return (
    <div className="flex justify-center">
      <div className="flex rounded-full border p-1">
        <div className="relative z-0 px-4 py-2">
          <div className="absolute inset-0 rounded-full bg-neutral-900" />
          <span className="relative block font-medium text-white text-xs">
            Yearly
            <span className="ml-2 font-semibold text-[10px] text-green-500">
              <span className="hidden lg:inline">Save </span>
              <span className="lg:hidden">-</span>20%
            </span>
          </span>
        </div>
        <div className="relative z-0 px-4 py-2">
          <span className="relative block font-medium text-muted-foreground text-xs">
            Monthly
          </span>
        </div>
      </div>
    </div>
  );
}

function PlanCardLoading({
  cta,
  features,
  name,
  subtitle,
}: {
  cta: string;
  features: readonly string[];
  name: string;
  subtitle: string;
}) {
  return (
    <Card className="flex h-full flex-col gap-0">
      <CardHeader className="pb-2">
        <CardTitle className="font-semibold text-lg">{name}</CardTitle>
        <div className="mt-2 flex items-baseline gap-1">
          <Skeleton className="h-8 w-20" />
          <span className="text-muted-foreground text-sm">/mo</span>
        </div>
        <p className="mt-1 text-muted-foreground text-xs">{subtitle}</p>
      </CardHeader>

      <CardContent className="flex-grow py-3">
        <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
          {features.map((feature) => (
            <li className="flex items-start gap-2" key={feature}>
              <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground" />
              <span className="text-xs">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="mt-auto pt-3">
        <Button className="w-full" disabled variant="outline">
          {cta}
        </Button>
      </CardFooter>
    </Card>
  );
}

function StudentDiscountCardStatic() {
  return (
    <Card className="mb-12 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Student Discount</p>
          <p className="text-muted-foreground text-sm">
            Students get 50% off the Pro plan
          </p>
        </div>
        <Button disabled variant="outline">
          Get started
        </Button>
      </div>
    </Card>
  );
}

export function PlansPageSkeleton() {
  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-4 sm:mb-8">
        <h1 className="font-semibold text-2xl tracking-tight sm:hidden">
          Plans
        </h1>
        <div className="hidden sm:block">
          <h1 className="font-semibold text-2xl tracking-tight sm:mb-2">
            Plans
          </h1>
          <p className="text-muted-foreground">
            Choose the plan that works for you
          </p>
        </div>
        <BillingToggleStatic />
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <PlanCardLoading {...PRO_PLAN} />
        <PlanCardLoading {...TEAM_PLAN} />
      </div>

      <StudentDiscountCardStatic />
      <PlanComparison />
    </div>
  );
}

const BILLING_DETAIL_FIELDS = [
  'Status',
  'Billing Period',
  'Current period start',
  'Current period end',
] as const;

export function BillingPageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="mb-2 font-semibold text-2xl tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing information
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="mb-2 font-semibold text-xl">
              Current Plan
            </CardTitle>
            <Button className="w-44" disabled variant="outline">
              Manage Subscription
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-64" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-semibold text-lg">
            Subscription Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-x-20 gap-y-3 md:grid-cols-2">
            {BILLING_DETAIL_FIELDS.map((field) => (
              <div className="flex justify-between" key={field}>
                <span className="text-muted-foreground text-sm">{field}</span>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-semibold text-lg">
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            To view your billing history, download invoices, or update payment
            methods, click &quot;Manage Subscription&quot; above to access the
            Stripe billing portal.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

const PROFILE_FIELDS = [
  { icon: Mail, label: 'Email' },
  { icon: Calendar, label: 'Member Since' },
  { icon: Shield, label: 'User ID' },
] as const;

export function ProfilePageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="mb-2 font-semibold text-2xl tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          View your account settings and preferences
        </p>
      </div>

      <section>
        <div className="mb-6">
          <h2 className="mb-2 font-semibold text-xl">Account Information</h2>
          <p className="text-muted-foreground text-sm">
            Your personal details and account status
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-semibold text-lg">
                <User2 className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Your personal account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-7 w-36" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>

              <div className="h-px w-full bg-border" />

              <div className="space-y-3">
                {PROFILE_FIELDS.map(({ icon: Icon, label }) => (
                  <div className="flex items-center gap-3" key={label}>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 space-y-1">
                      <p className="font-medium text-sm">{label}</p>
                      <Skeleton className="h-4 w-40" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

const USAGE_STATS = [
  { icon: TrendingUp, label: 'Words Used' },
  { icon: FileText, label: 'Dictations' },
  { icon: TrendingUp, label: 'Words Processed' },
  { icon: Clock, label: 'Time Saved' },
] as const;

const PERFORMANCE_STATS = [
  'Total Words',
  'Total Time Saved',
  'Avg. Words per Dictation',
] as const;

function UsageStatCard({
  icon: Icon,
  label,
}: {
  icon: typeof TrendingUp;
  label: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
          <Icon className="h-4 w-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20" />
        <Skeleton className="mt-1 h-3 w-16" />
      </CardContent>
    </Card>
  );
}

function UsageMobileRow({
  icon: Icon,
  label,
}: {
  icon: typeof TrendingUp;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <div className="space-y-1 text-right">
        <Skeleton className="ml-auto h-7 w-16" />
        <Skeleton className="ml-auto h-3 w-20" />
      </div>
    </div>
  );
}

export function UsagePageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="mb-2 font-semibold text-2xl tracking-tight">Usage</h1>
        <p className="text-muted-foreground">
          Track your dictation usage and performance metrics
        </p>
      </div>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="font-medium text-base">
              Weekly Usage Limit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span>Words Used</span>
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="mt-2 h-2 w-full" />
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-6">
          <h2 className="mb-2 font-semibold text-xl">Current Period</h2>
          <p className="text-muted-foreground text-sm">
            Your usage statistics for this week and month
          </p>
        </div>

        <div className="grid gap-4 md:hidden">
          <Card>
            <CardHeader>
              <CardTitle className="font-medium text-base">
                Usage & Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <UsageMobileRow icon={TrendingUp} label="Words Used" />
              <UsageMobileRow icon={FileText} label="Dictations" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-medium text-base">
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <UsageMobileRow icon={TrendingUp} label="Words Processed" />
              <UsageMobileRow icon={Clock} label="Time Saved" />
            </CardContent>
          </Card>
        </div>

        <div className="hidden gap-6 md:grid md:grid-cols-4">
          {USAGE_STATS.map((stat) => (
            <UsageStatCard icon={stat.icon} key={stat.label} label={stat.label} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-6">
          <h2 className="mb-2 font-semibold text-xl">All Time Performance</h2>
          <p className="text-muted-foreground text-sm">
            Your overall usage patterns and efficiency metrics
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-semibold text-lg">
                Performance Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {PERFORMANCE_STATS.map((label) => (
                <div
                  className="flex items-center justify-between py-2"
                  key={label}
                >
                  <span className="font-medium text-muted-foreground text-sm">
                    {label}
                  </span>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

const SEAT_FIELDS = ['Total', 'Used', 'Available'] as const;

export function TeamPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h1 className="mb-1 font-semibold text-2xl tracking-tight">Team</h1>
        <p className="text-muted-foreground">
          Manage your team members and seats
        </p>
      </div>

      <div className="flex gap-2">
        <Button disabled variant="outline">
          <Plus />
          Increase Seats
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-medium text-base">Seats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {SEAT_FIELDS.map((label) => (
              <div className="flex justify-between" key={label}>
                <span className="text-muted-foreground">{label}</span>
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-medium text-base">Add Member</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input disabled placeholder="name@example.com" type="email" />
          <Button disabled>
            <PlusCircle />
            Add Member
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-medium text-base">Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {['member-1', 'member-2'].map((member) => (
            <div className="flex items-center justify-between" key={member}>
              <div className="space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
