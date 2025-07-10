import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import { Mic, Settings, Zap } from "lucide-react";

import { Button } from "@acme/ui/components/ui/button";
import { Card, CardContent } from "@acme/ui/components/ui/card";

export const Route = createFileRoute("/_authenticated/recording")({
  component: RecordingLayout,
});

function RecordingLayout() {
  const location = useLocation();

  const tabs = [
    {
      title: "New Recording",
      href: "/recording/new",
      icon: Mic,
    },
    {
      title: "Voice Training",
      href: "/recording/training",
      icon: Zap,
    },
    {
      title: "Audio Settings",
      href: "/recording/settings",
      icon: Settings,
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Recording</h1>
        <p className="text-muted-foreground">
          Record and manage your voice transcriptions
        </p>
      </div>

      {/* Tab Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 border-b">
            {tabs.map((tab) => (
              <Button
                key={tab.href}
                variant={location.pathname === tab.href ? "default" : "ghost"}
                size="sm"
                className="gap-2"
                asChild
              >
                <Link to={tab.href}>
                  <tab.icon className="h-4 w-4" />
                  {tab.title}
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Child routes will render here */}
      <Outlet />
    </div>
  );
}
