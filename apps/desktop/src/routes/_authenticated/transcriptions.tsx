import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import { Clock, FileText, Star } from "lucide-react";

import { Button } from "@acme/ui/components/ui/button";
import { Card, CardContent } from "@acme/ui/components/ui/card";

export const Route = createFileRoute("/_authenticated/transcriptions")({
  component: TranscriptionsLayout,
});

function TranscriptionsLayout() {
  const location = useLocation();

  const tabs = [
    {
      title: "Recent",
      href: "/transcriptions/recent",
      icon: Clock,
    },
    {
      title: "All Files",
      href: "/transcriptions/all",
      icon: FileText,
    },
    {
      title: "Favorites",
      href: "/transcriptions/favorites",
      icon: Star,
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transcriptions</h1>
        <p className="text-muted-foreground">
          Manage and organize your transcription files
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
