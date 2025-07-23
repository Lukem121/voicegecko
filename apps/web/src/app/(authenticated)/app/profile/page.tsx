"use client";

import { Calendar, Mail, Shield, User2 } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@acme/ui/components/ui/avatar";
import { Badge } from "@acme/ui/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@acme/ui/components/ui/card";
import { Separator } from "@acme/ui/components/ui/separator";

import { useUser } from "~/hooks/auth";

export default function WebProfilePage() {
  const user = useUser();

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      <p className="text-muted-foreground">
        View your account settings and preferences
      </p>

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
                <AvatarImage src={user?.image ?? ""} alt={user?.name ?? ""} />
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
                  {user?.name ?? "Unknown User"}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {user?.email ?? "No email"}
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
                    {user?.email ?? "Not provided"}
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
                    {user?.id ?? "Unknown"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
