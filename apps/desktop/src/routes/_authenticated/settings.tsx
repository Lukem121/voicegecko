import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { LazyStore } from "@tauri-apps/plugin-store";
import {
  Globe,
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

import type {
  AudioDevice,
  NotificationSound,
  NotificationTiming,
} from "~/hooks/use-recording-store";
import { useRecordingStore } from "~/hooks/use-recording-store";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

const SETTINGS_VERSION = 1;
const store = new LazyStore("settings.dat");

function SettingsPage() {
  const {
    devices,
    selectedDevice,
    selectedSound,
    notificationTiming,
    volume,
    setDevices,
    setSelectedDevice,
    setSelectedSound,
    setNotificationTiming,
    setVolume,
  } = useRecordingStore();

  useEffect(() => {
    async function migrateAndLoadSettings() {
      const currentVersion = (await store.get<number>("version")) ?? 0;

      if (currentVersion < SETTINGS_VERSION) {
        if (currentVersion < 1) {
          // Migrating from unversioned to v1
          // Ensure default values exist for new settings
          const volume = await store.get<number>("volume");
          if (volume === undefined) {
            await store.set("volume", 1.0);
          }
          const timing =
            await store.get<NotificationTiming>("notificationTiming");
          if (timing === undefined) {
            await store.set("notificationTiming", "start_stop");
          }
        }
        // Future migrations would go here in `if (currentVersion < 2)` blocks

        await store.set("version", SETTINGS_VERSION);
        await store.save();
      }

      // Load all settings from store
      const savedDevice = await store.get<AudioDevice>("selectedDevice");
      if (savedDevice) {
        setSelectedDevice(savedDevice);
      }
      const savedSound = await store.get<NotificationSound>("selectedSound");
      if (savedSound) {
        setSelectedSound(savedSound);
      }
      const savedTiming =
        await store.get<NotificationTiming>("notificationTiming");
      if (savedTiming) {
        setNotificationTiming(savedTiming);
      }
      const savedVolume = await store.get<number>("volume");
      if (savedVolume !== undefined) {
        setVolume(savedVolume);
        void invoke("set_volume", { volume: savedVolume });
      }
    }

    async function getDevices() {
      try {
        const audioDevices = await invoke<AudioDevice[]>("list_audio_devices");
        setDevices(audioDevices);
        if (!selectedDevice && audioDevices.length > 0) {
          const defaultDevice =
            audioDevices.find((d) => d.name.includes("Default")) ??
            audioDevices[0];
          if (defaultDevice) {
            setSelectedDevice(defaultDevice);
          }
        }
      } catch (error) {
        console.error("Failed to get audio devices:", error);
      }
    }

    void migrateAndLoadSettings();
    void getDevices();
  }, [
    setDevices,
    setSelectedDevice,
    setSelectedSound,
    setNotificationTiming,
    setVolume,
    selectedDevice,
  ]);

  const handleDeviceChange = (deviceName: string) => {
    const device = devices.find((d) => d.name === deviceName) ?? null;
    setSelectedDevice(device);
    void store.set("selectedDevice", device);
  };

  const handleSoundChange = (sound: NotificationSound) => {
    setSelectedSound(sound);
    void store.set("selectedSound", sound);
  };

  const handleTimingChange = (timing: NotificationTiming) => {
    setNotificationTiming(timing);
    void store.set("notificationTiming", timing);
  };

  const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0] ?? 1.0;
    setVolume(vol);
    void store.set("volume", vol);
    void invoke("set_volume", { volume: vol });
  };

  const handleTestSound = () => {
    if (notificationTiming !== "disabled") {
      void invoke("play_notification_sound", {
        soundName: `${selectedSound}.mp3`,
        variant: "Start",
      });
    }
  };

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
                  <Label htmlFor="launch-on-startup">Launch on startup</Label>
                  <p className="text-muted-foreground text-sm">
                    Start the application when your computer boots
                  </p>
                </div>
                <Switch id="launch-on-startup" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-gecko-bar">
                    Show gecko bar at all times
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    Keep the gecko widget visible at the bottom of your screen
                  </p>
                </div>
                <Switch id="show-gecko-bar" defaultChecked />
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
              <Select
                value={selectedDevice?.name}
                onValueChange={handleDeviceChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a microphone" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem key={device.name} value={device.name}>
                      {device.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Notification Sound</Label>
                <Select
                  value={selectedSound}
                  onValueChange={(value) =>
                    handleSoundChange(value as NotificationSound)
                  }
                  disabled={notificationTiming === "disabled"}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a sound" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chime">🔔 Chime</SelectItem>
                    <SelectItem value="beep">📢 Beep</SelectItem>
                    <SelectItem value="tone">🎵 Tone</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Play Notification Sound</Label>
                <Select
                  value={notificationTiming}
                  onValueChange={(value) =>
                    handleTimingChange(value as NotificationTiming)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select when to play sounds" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="start_stop">On Start/Stop</SelectItem>
                    <SelectItem value="completion">On Completion</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notification Volume</Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[volume]}
                  onValueChange={handleVolumeChange}
                  max={1}
                  step={0.1}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleTestSound}
                >
                  <Volume2 className="h-4 w-4" />
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
                <Label htmlFor="interaction-sounds">Interaction sounds</Label>
                <p className="text-muted-foreground text-sm">
                  Play sounds for key actions like start/stop recording
                </p>
              </div>
              <Switch id="interaction-sounds" defaultChecked />
            </div>

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
