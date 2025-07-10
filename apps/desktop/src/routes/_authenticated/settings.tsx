import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  FileText,
  Globe,
  Keyboard,
  Mic,
  Palette,
  Settings,
  Shield,
} from "lucide-react";

import { Button } from "@acme/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@acme/ui/components/ui/card";
import { Label } from "@acme/ui/components/ui/label";
import { Separator } from "@acme/ui/components/ui/separator";
import { Switch } from "@acme/ui/components/ui/switch";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
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

      <div className="grid gap-4 md:grid-cols-2">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              General
            </CardTitle>
            <CardDescription>Basic application settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-save">Auto-save transcriptions</Label>
                  <p className="text-muted-foreground text-sm">
                    Automatically save transcriptions as you record
                  </p>
                </div>
                <Switch id="auto-save" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-timestamps">Show timestamps</Label>
                  <p className="text-muted-foreground text-sm">
                    Display timestamps in transcriptions
                  </p>
                </div>
                <Switch id="show-timestamps" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-punctuation">Auto-punctuation</Label>
                  <p className="text-muted-foreground text-sm">
                    Automatically add punctuation marks
                  </p>
                </div>
                <Switch id="auto-punctuation" defaultChecked />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Choose what you want to be notified about
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="transcription-complete">
                    Transcription complete
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    Notify when transcription is finished
                  </p>
                </div>
                <Switch id="transcription-complete" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="low-storage">Low storage warning</Label>
                  <p className="text-muted-foreground text-sm">
                    Alert when storage space is low
                  </p>
                </div>
                <Switch id="low-storage" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="update-available">Update available</Label>
                  <p className="text-muted-foreground text-sm">
                    Notify when app updates are available
                  </p>
                </div>
                <Switch id="update-available" defaultChecked />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audio Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Audio
            </CardTitle>
            <CardDescription>
              Configure audio recording preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Audio Quality</Label>
              <Button variant="outline" className="w-full justify-start">
                High Quality (48kHz, 16-bit)
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Default Microphone</Label>
              <Button variant="outline" className="w-full justify-start">
                Built-in Microphone
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="noise-suppression">Noise suppression</Label>
                <p className="text-muted-foreground text-sm">
                  Reduce background noise
                </p>
              </div>
              <Switch id="noise-suppression" defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy & Security
            </CardTitle>
            <CardDescription>
              Manage your privacy and security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Data Retention</Label>
              <Button variant="outline" className="w-full justify-start">
                Keep transcriptions for 1 year
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="analytics">Usage analytics</Label>
                <p className="text-muted-foreground text-sm">
                  Help improve the app by sharing usage data
                </p>
              </div>
              <Switch id="analytics" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="crash-reports">Crash reports</Label>
                <p className="text-muted-foreground text-sm">
                  Automatically send crash reports
                </p>
              </div>
              <Switch id="crash-reports" defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
          <CardDescription>Advanced configuration options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" className="justify-start gap-2">
              <FileText className="h-4 w-4" />
              Export Settings
            </Button>
            <Button variant="outline" className="justify-start gap-2">
              <Globe className="h-4 w-4" />
              Language Settings
            </Button>
            <Button variant="outline" className="justify-start gap-2">
              <Keyboard className="h-4 w-4" />
              Keyboard Shortcuts
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
