import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
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

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="launch-on-startup">Launch on startup</Label>
                  <p className="text-muted-foreground text-sm">
                    Start the application when your computer boots
                  </p>
                </div>
                <Switch id="launch-on-startup" />
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
                  <Label htmlFor="interaction-sounds">Interaction sounds</Label>
                  <p className="text-muted-foreground text-sm">
                    Play sounds for key actions like start/stop recording
                  </p>
                </div>
                <Switch id="interaction-sounds" defaultChecked />
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

            <div className="space-y-2">
              <Label>Recording Stop/Start Sound</Label>
              <Button variant="outline" className="w-full justify-start">
                Chime (Default)
              </Button>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="text-xs">
                  🔔 Chime
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  📢 Beep
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  🎵 Tone
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  🔇 Silent
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="mute-system-audio">Mute system audio</Label>
                <p className="text-muted-foreground text-sm">
                  Silence all other audio when recording to reduce background
                  noise
                </p>
              </div>
              <Switch id="mute-system-audio" />
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

        {/* Personalization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Personalization
            </CardTitle>
            <CardDescription>
              Customize the app experience for your needs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="smart-formatting">Smart formatting</Label>
                <p className="text-muted-foreground text-sm">
                  Use AI to intelligently format your dictation text
                </p>
              </div>
              <Switch id="smart-formatting" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-dictionary">Auto add to dictionary</Label>
                <p className="text-muted-foreground text-sm">
                  Help AI learn your frequently used words for better
                  recognition
                </p>
              </div>
              <Switch id="auto-dictionary" defaultChecked />
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
          <div className="grid gap-4 md:grid-cols-2">
            <Button variant="outline" className="justify-start gap-2">
              <Keyboard className="h-4 w-4" />
              Keyboard Shortcuts
            </Button>
            <Button variant="outline" className="justify-start gap-2">
              <Globe className="h-4 w-4" />
              Language Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
