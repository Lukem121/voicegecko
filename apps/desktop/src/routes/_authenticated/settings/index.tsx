import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Cpu,
  Keyboard,
  Mic,
  Palette,
  Settings,
  Shield,
  Volume2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@acme/ui/components/ui/select";
import { Slider } from "@acme/ui/components/ui/slider";
import { Switch } from "@acme/ui/components/ui/switch";

import { useAudioHelpers } from "~/hooks/use-audio-helpers";
import { useSettingsStore } from "~/stores/settings.store";

export const Route = createFileRoute("/_authenticated/settings/")({
  component: SettingsPage,
});

function SettingsPage() {
  const {
    settings,
    audioDevices,
    updateAudioDevice,
    updateNotificationSound,
    updateNotificationTiming,
    updateNotificationVolume,
    updateMuteSystemAudio,
    updateLaunchOnStartup,
    updateShowGeckoBar,
    updateHideGeckoOnFullscreen,
    updatePrivacySetting,
    updatePersonalizationSetting,
  } = useSettingsStore();

  const { playTestSound } = useAudioHelpers();

  return (
    <div className="flex flex-1 flex-col gap-4">
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
                  <Label>Launch on startup</Label>
                  <p className="text-muted-foreground text-sm">
                    Start the application when your computer boots
                  </p>
                </div>
                <Switch
                  checked={settings.general.launchOnStartup}
                  onCheckedChange={updateLaunchOnStartup}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show gecko bar at all times</Label>
                  <p className="text-muted-foreground text-sm">
                    Keep the gecko widget visible at the bottom of your screen
                  </p>
                </div>
                <Switch
                  checked={settings.general.showGeckoBar}
                  onCheckedChange={updateShowGeckoBar}
                />
              </div>

              {settings.general.showGeckoBar && (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Hide on fullscreen</Label>
                    <p className="text-muted-foreground text-sm">
                      Automatically hide gecko bar when fullscreen apps are
                      detected
                    </p>
                  </div>
                  <Switch
                    checked={settings.general.hideGeckoOnFullscreen}
                    onCheckedChange={updateHideGeckoOnFullscreen}
                  />
                </div>
              )}
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
              <Label htmlFor="microphone">Default Microphone</Label>
              <Select
                value={settings.audio.selectedDevice?.name ?? ""}
                onValueChange={(name) => {
                  const device =
                    audioDevices.find((d) => d.name === name) ?? null;
                  void updateAudioDevice(device);
                }}
              >
                <SelectTrigger id="microphone">
                  <SelectValue placeholder="Select a microphone" />
                </SelectTrigger>
                <SelectContent>
                  {audioDevices.map((device) => (
                    <SelectItem key={device.name} value={device.name}>
                      {device.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="notification-sound">Notification Sound</Label>
                <Select
                  value={settings.audio.selectedSound}
                  onValueChange={updateNotificationSound}
                  disabled={settings.audio.notificationTiming === "disabled"}
                >
                  <SelectTrigger id="notification-sound">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chime">🔔 Chime</SelectItem>
                    <SelectItem value="beep">📢 Beep</SelectItem>
                    <SelectItem value="tone">🎵 Tone</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notification-timing">
                  Play Notification Sound
                </Label>
                <Select
                  value={settings.audio.notificationTiming}
                  onValueChange={updateNotificationTiming}
                >
                  <SelectTrigger id="notification-timing">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="start_completion">
                      Start + Completion
                    </SelectItem>
                    <SelectItem value="start_stop">
                      Start + Stop Recording
                    </SelectItem>
                    <SelectItem value="completion_only">
                      Completion Only
                    </SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="volume">Notification Volume</Label>
              <div className="flex items-center gap-2">
                <Slider
                  id="volume"
                  value={[settings.audio.notificationVolume]}
                  onValueChange={(v) => updateNotificationVolume(v[0] ?? 1)}
                  max={1}
                  step={0.1}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={playTestSound}
                  type="button"
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Mute system audio</Label>
                <p className="text-muted-foreground text-sm">
                  Silence all other audio when recording to reduce background
                  noise
                </p>
              </div>
              <Switch
                checked={settings.audio.muteSystemAudio}
                onCheckedChange={updateMuteSystemAudio}
              />
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
                <Label>Usage analytics</Label>
                <p className="text-muted-foreground text-sm">
                  Help improve the app by sharing usage data
                </p>
              </div>
              <Switch
                checked={settings.privacy.usageAnalytics}
                onCheckedChange={(checked) =>
                  updatePrivacySetting("usageAnalytics", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Crash reports</Label>
                <p className="text-muted-foreground text-sm">
                  Automatically send crash reports
                </p>
              </div>
              <Switch
                checked={settings.privacy.crashReports}
                onCheckedChange={(checked) =>
                  updatePrivacySetting("crashReports", checked)
                }
              />
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
                <Label>Interaction sounds</Label>
                <p className="text-muted-foreground text-sm">
                  Play sounds for key actions like start/stop recording
                </p>
              </div>
              <Switch
                checked={settings.personalization.interactionSounds}
                onCheckedChange={(checked) =>
                  updatePersonalizationSetting("interactionSounds", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Smart formatting</Label>
                <p className="text-muted-foreground text-sm">
                  Use AI to intelligently format your dictation text
                </p>
              </div>
              <Switch
                checked={settings.personalization.smartFormatting}
                onCheckedChange={(checked) =>
                  updatePersonalizationSetting("smartFormatting", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto add to dictionary</Label>
                <p className="text-muted-foreground text-sm">
                  Help AI learn your frequently used words for better
                  recognition
                </p>
              </div>
              <Switch
                checked={settings.personalization.autoAddToDictionary}
                onCheckedChange={(checked) =>
                  updatePersonalizationSetting("autoAddToDictionary", checked)
                }
              />
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
            <Link to="/settings/shortcuts" className="w-full">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Keyboard className="h-4 w-4" />
                Keyboard Shortcuts
              </Button>
            </Link>
            <Link to="/settings/models" className="w-full">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Cpu className="h-4 w-4" />
                Model Settings
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
