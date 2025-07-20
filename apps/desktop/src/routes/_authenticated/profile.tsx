import { createFileRoute } from "@tanstack/react-router";
import { Calendar, Mail, Shield, User2 } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@acme/ui/components/ui/avatar";
import { Badge } from "@acme/ui/components/ui/badge";
import { Button } from "@acme/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@acme/ui/components/ui/card";
import { Separator } from "@acme/ui/components/ui/separator";

import { useUser } from "~/hooks/auth";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const user = useUser();

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>
        <Button>Edit Profile</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Profile Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User2 className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Your personal account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
                <AvatarFallback>
                  {user?.name
                    ? user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                    : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">
                  {user?.name || "Unknown User"}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {user?.email || "No email"}
                </p>
                <Badge variant="outline" className="w-fit">
                  {user?.emailVerified ? "Verified" : "Unverified"}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="text-muted-foreground h-4 w-4" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-muted-foreground text-sm">
                    {user?.email || "Not provided"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="text-muted-foreground h-4 w-4" />
                <div>
                  <p className="text-sm font-medium">Member Since</p>
                  <p className="text-muted-foreground text-sm">
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : "Unknown"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Shield className="text-muted-foreground h-4 w-4" />
                <div>
                  <p className="text-sm font-medium">User ID</p>
                  <p className="text-muted-foreground font-mono text-sm">
                    {user?.id || "Unknown"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>Manage your account preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Email Notifications</h4>
              <p className="text-muted-foreground text-sm">
                Manage how you receive notifications
              </p>
              <Button variant="outline" size="sm">
                Configure
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Privacy Settings</h4>
              <p className="text-muted-foreground text-sm">
                Control your data and privacy preferences
              </p>
              <Button variant="outline" size="sm">
                Manage
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Account Security</h4>
              <p className="text-muted-foreground text-sm">
                Update your password and security settings
              </p>
              <Button variant="outline" size="sm">
                Security
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for additional profile sections */}
      <Card>
        <CardHeader>
          <CardTitle>Transcription Preferences</CardTitle>
          <CardDescription>
            Customize your transcription settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">Default Language</h4>
              <p className="text-muted-foreground text-sm">English (US)</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Audio Quality</h4>
              <p className="text-muted-foreground text-sm">High Quality</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Auto-Save</h4>
              <p className="text-muted-foreground text-sm">Enabled</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Export Format</h4>
              <p className="text-muted-foreground text-sm">Text (.txt)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
