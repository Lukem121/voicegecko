"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, GraduationCap, X } from "lucide-react";

import { Button } from "@acme/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@acme/ui/components/ui/card";
import { cn } from "@acme/ui/lib/utils";

type BillingPeriod = "monthly" | "annual";
type CellValue = "check" | "x" | string;

interface ComparisonTableProps {
  firstColumnHeader: string;
  data: {
    feature: string;
    basic: CellValue;
    pro: CellValue;
    teams: CellValue;
  }[];
}

const ComparisonTable = ({ firstColumnHeader, data }: ComparisonTableProps) => {
  const renderCell = (value: CellValue) => {
    if (value === "check") {
      return <Check className="text-muted-foreground mx-auto h-4 w-4" />;
    }
    if (value === "x") {
      return <X className="mx-auto h-4 w-4 text-red-500" />;
    }
    return (
      <span className="text-muted-foreground block text-center text-sm">
        {value}
      </span>
    );
  };

  return (
    <div className="mb-8">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="border-b">
              <th className="w-1/4 px-4 py-3 text-left font-medium">
                {firstColumnHeader}
              </th>
              <th className="w-1/4 px-4 py-3 text-center font-medium">Basic</th>
              <th className="w-1/4 px-4 py-3 text-center font-medium">Pro</th>
              <th className="w-1/4 px-4 py-3 text-center font-medium">Teams</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className="border-b border-gray-100">
                <td className="w-1/4 px-4 py-3 text-sm">{row.feature}</td>
                <td className="w-1/4 px-4 py-3">{renderCell(row.basic)}</td>
                <td className="w-1/4 px-4 py-3">{renderCell(row.pro)}</td>
                <td className="w-1/4 px-4 py-3">{renderCell(row.teams)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Toggle = ({
  selected,
  setSelected,
}: {
  selected: BillingPeriod;
  setSelected: (period: BillingPeriod) => void;
}) => {
  const isYearly = selected === "annual";
  return (
    <div className="flex justify-center">
      <div className="flex rounded-full border p-1">
        <button
          className={cn("relative z-0 px-4 py-2", isYearly ? "z-1" : "z-0")}
          onClick={() => setSelected("annual")}
        >
          {isYearly && (
            <motion.div
              className="absolute inset-0 rounded-full bg-neutral-900"
              layoutId="toggleBackground"
              initial={false}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
          <span
            className={cn(
              "relative block text-xs font-medium",
              isYearly ? "text-white" : "text-muted-foreground",
              "duration-200",
            )}
          >
            Yearly
            <span className="ml-2 text-[10px] font-semibold text-green-500">
              <span className="hidden lg:inline">Save </span>
              <span className="lg:hidden">-</span>20%
            </span>
          </span>
        </button>
        <button
          className={cn("relative z-0 px-4 py-2", !isYearly ? "z-1" : "z-0")}
          onClick={() => setSelected("monthly")}
        >
          {!isYearly && (
            <motion.div
              className="absolute inset-0 rounded-full bg-neutral-900"
              layoutId="toggleBackground"
              initial={false}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
          <span
            className={cn(
              "relative block text-xs font-medium",
              !isYearly ? "text-white" : "text-muted-foreground",
              "duration-200",
            )}
          >
            Monthly
          </span>
        </button>
      </div>
    </div>
  );
};

export default function PlansPage() {
  const plans = [
    {
      name: "Basic",
      monthlyPrice: "$0",
      yearlyMonthlyPrice: "$0",
      isFree: true,
      subtitle: "Start of your productivity journey",
      features: [
        "2,000 words per week",
        "Lightning fast voice typing",
        "Add words to dictionary",
        "Privacy mode",
      ],
      cta: "Get started",
      variant: "outline" as const,
    },
    {
      name: "Pro",
      monthlyPrice: "$29",
      yearlyMonthlyPrice: "$24",
      subtitle: "All of our features",
      features: [
        "Unlimited transcriptions",
        "Advanced AI processing",
        "Export formats",
        "Priority support",
        "Cloud sync",
        "Advanced features",
      ],
      cta: "Get started",
      variant: "outline" as const,
    },
    {
      name: "Teams",
      monthlyPrice: "$12",
      yearlyMonthlyPrice: "$10",
      period: "user",
      subtitle: "All of our features across your team",
      features: [
        "Everything in Pro",
        "Team management",
        "User permissions",
        "API access",
        "Custom integrations",
        "Dedicated support",
      ],
      cta: "Get started",
      variant: "outline" as const,
    },
  ];

  const devicePlatformData = [
    {
      feature: "Desktop Mac",
      basic: "check" as const,
      pro: "check" as const,
      teams: "check" as const,
    },
    {
      feature: "Desktop Windows",
      basic: "check" as const,
      pro: "check" as const,
      teams: "check" as const,
    },
    {
      feature: "iPhone",
      basic: "Coming soon",
      pro: "Coming soon",
      teams: "Coming soon",
    },
    {
      feature: "Android",
      basic: "Coming soon",
      pro: "Coming soon",
      teams: "Coming soon",
    },
  ];

  const voiceTypingData = [
    {
      feature: "Word Limit",
      basic: "check" as const,
      pro: "check" as const,
      teams: "check" as const,
    },
    {
      feature: "Add Words to Dictionary",
      basic: "2,000 a week",
      pro: "Unlimited",
      teams: "Unlimited",
    },
    {
      feature: "Prioritized Feature Requests",
      basic: "x" as const,
      pro: "check" as const,
      teams: "check" as const,
    },
    {
      feature: "Early Access to New Features",
      basic: "x" as const,
      pro: "check" as const,
      teams: "check" as const,
    },
  ];

  const teamCollaborationData = [
    {
      feature: "Centralized Billing",
      basic: "x" as const,
      pro: "x" as const,
      teams: "check" as const,
    },
    {
      feature: "Shared Contacts",
      basic: "x" as const,
      pro: "x" as const,
      teams: "Coming soon",
    },
    {
      feature: "Customer Support",
      basic: "Standard",
      pro: "Prioritized",
      teams: "Prioritized",
    },
  ];

  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const isYearly = billingPeriod === "annual";

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-medium">Plans</h1>
        <p className="text-muted-foreground mb-6">
          Choose the plan that works for you
        </p>

        {/* Billing Toggle */}
        <Toggle selected={billingPeriod} setSelected={setBillingPeriod} />
      </div>

      {/* Plans */}
      <div className="mb-8 grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className="flex h-full flex-col border-0 shadow-sm"
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-medium">{plan.name}</CardTitle>
              <div className="mt-4 flex items-baseline gap-1">
                {plan.isFree ? (
                  <span className="text-3xl font-bold">Free</span>
                ) : (
                  <>
                    <span className="text-3xl font-bold">
                      {isYearly ? plan.yearlyMonthlyPrice : plan.monthlyPrice}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      /{plan.period ? `${plan.period}/` : ""}mo
                    </span>
                  </>
                )}
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                {plan.subtitle}
              </p>
            </CardHeader>

            <CardContent className="flex-grow">
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="mt-auto pt-6">
              <Button className="w-full" variant={plan.variant}>
                {plan.cta}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Student Discount Card */}
      <Card className="mb-12 border-0 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Student Discount</p>
            <p className="text-muted-foreground text-sm">
              Students get 50% off the Pro plan
            </p>
          </div>
          <Button variant="outline">Get started</Button>
        </div>
      </Card>

      {/* Plans and Features */}
      <div className="mt-16">
        <div className="mb-12 text-center">
          <h2 className="mb-2 text-2xl font-medium">Plans and Features</h2>
          <p className="text-muted-foreground">
            Compare what's included in each plan
          </p>
        </div>

        <ComparisonTable
          firstColumnHeader="Device and Platform"
          data={devicePlatformData}
        />
        <ComparisonTable
          firstColumnHeader="Effortless Voice Typing"
          data={voiceTypingData}
        />
        <ComparisonTable
          firstColumnHeader="Team and Collaboration"
          data={teamCollaborationData}
        />
      </div>
    </div>
  );
}
