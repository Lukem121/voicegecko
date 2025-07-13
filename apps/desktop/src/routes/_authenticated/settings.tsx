import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { ChevronRight, Cpu, Type } from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@acme/ui/components/ui/card";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsLayout,
});

const settingsCards = [
  {
    title: "Models",
    description: "Manage local and cloud transcription models",
    icon: Cpu,
    to: "/settings/models",
  },
  {
    title: "Transcription",
    description: "Language and performance settings",
    icon: Type,
    to: "/settings/transcription",
  },
];

function SettingsCard({
  title,
  description,
  icon: Icon,
  to,
  isActive,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  to: string;
  isActive: boolean;
}) {
  return (
    <Link to={to}>
      <Card
        className={`hover:border-primary/80 transition-colors ${
          isActive ? "border-primary" : ""
        }`}
      >
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <Icon className="h-6 w-6" />
            <div className="space-y-1">
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <ChevronRight className="text-muted-foreground h-5 w-5" />
        </CardHeader>
      </Card>
    </Link>
  );
}

function SettingsLayout() {
  const { location } = useRouterState();
  const isRootSettings = location.pathname === "/settings";

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your application preferences and account settings
          </p>
        </div>
      </div>

      {isRootSettings ? (
        <div className="grid gap-4 md:grid-cols-2">
          {settingsCards.map((card) => (
            <SettingsCard
              key={card.to}
              {...card}
              isActive={location.pathname.startsWith(card.to)}
            />
          ))}
        </div>
      ) : (
        <Outlet />
      )}
    </div>
  );
}
