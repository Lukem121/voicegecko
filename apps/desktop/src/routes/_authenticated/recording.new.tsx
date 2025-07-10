import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Mic,
  Pause,
  Play,
  Save,
  Settings,
  Square,
  Volume2,
} from "lucide-react";

import { Badge } from "@acme/ui/components/ui/badge";
import { Button } from "@acme/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@acme/ui/components/ui/card";
import { Input } from "@acme/ui/components/ui/input";
import { Label } from "@acme/ui/components/ui/label";
import { Progress } from "@acme/ui/components/ui/progress";
import { Separator } from "@acme/ui/components/ui/separator";

export const Route = createFileRoute("/_authenticated/recording/new")({
  component: NewRecordingPage,
});

function NewRecordingPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState("00:00");
  const [audioLevel, setAudioLevel] = useState(65);

  return (
    <div className="space-y-6">
      {/* Recording Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Recording Controls
          </CardTitle>
          <CardDescription>Start a new voice recording session</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Recording Interface */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div
                className={`flex h-32 w-32 items-center justify-center rounded-full border-4 transition-all duration-300 ${
                  isRecording
                    ? "animate-pulse border-red-500 bg-red-50"
                    : "border-gray-300 bg-gray-50"
                }`}
              >
                {isRecording ? (
                  <Mic className="h-16 w-16 text-red-600" />
                ) : (
                  <Mic className="h-16 w-16 text-gray-600" />
                )}
              </div>
              {isRecording && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2"
                >
                  REC
                </Badge>
              )}
            </div>

            <div className="text-center">
              <div className="font-mono text-3xl font-bold">
                {recordingTime}
              </div>
              <p className="text-muted-foreground text-sm">
                {isRecording
                  ? isPaused
                    ? "Recording paused"
                    : "Recording in progress..."
                  : "Ready to record"}
              </p>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center gap-4">
              {!isRecording ? (
                <Button
                  size="lg"
                  className="gap-2"
                  onClick={() => setIsRecording(true)}
                >
                  <Mic className="h-5 w-5" />
                  Start Recording
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setIsPaused(!isPaused)}
                  >
                    {isPaused ? (
                      <Play className="h-5 w-5" />
                    ) : (
                      <Pause className="h-5 w-5" />
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={() => {
                      setIsRecording(false);
                      setIsPaused(false);
                    }}
                  >
                    <Square className="h-5 w-5" />
                  </Button>
                  <Button variant="outline" size="lg">
                    <Save className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Audio Level Meter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Audio Level
              </Label>
              <span className="text-muted-foreground text-sm">
                {audioLevel}%
              </span>
            </div>
            <Progress value={audioLevel} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Recording Settings */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recording Settings</CardTitle>
            <CardDescription>
              Configure your recording preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="filename">File Name</Label>
              <Input
                id="filename"
                placeholder="My Recording"
                defaultValue={`Recording ${new Date().toLocaleDateString()}`}
              />
            </div>

            <div className="space-y-2">
              <Label>Audio Quality</Label>
              <Button variant="outline" className="w-full justify-start">
                High Quality (48kHz, 16-bit)
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Language</Label>
              <Button variant="outline" className="w-full justify-start">
                English (US)
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Microphone</Label>
              <Button variant="outline" className="w-full justify-start">
                Built-in Microphone
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transcription Options</CardTitle>
            <CardDescription>
              Customize how your audio is transcribed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Real-time transcription</Label>
                <p className="text-muted-foreground text-sm">
                  See transcription as you speak
                </p>
              </div>
              <Button variant="outline" size="sm">
                Enable
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-punctuation</Label>
                <p className="text-muted-foreground text-sm">
                  Automatically add punctuation
                </p>
              </div>
              <Button variant="outline" size="sm">
                Enable
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Speaker identification</Label>
                <p className="text-muted-foreground text-sm">
                  Identify different speakers
                </p>
              </div>
              <Button variant="outline" size="sm">
                Disable
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Timestamp markers</Label>
                <p className="text-muted-foreground text-sm">
                  Add time markers to transcript
                </p>
              </div>
              <Button variant="outline" size="sm">
                Enable
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recording Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <h4 className="font-medium">🎤 Audio Quality</h4>
              <p className="text-muted-foreground text-sm">
                Speak clearly and maintain consistent distance from microphone
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-medium">🔇 Noise Reduction</h4>
              <p className="text-muted-foreground text-sm">
                Record in a quiet environment to improve transcription accuracy
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-medium">⏸️ Pause Function</h4>
              <p className="text-muted-foreground text-sm">
                Use pause to collect your thoughts without stopping the session
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-medium">💾 Auto-save</h4>
              <p className="text-muted-foreground text-sm">
                Your recording is automatically saved every 30 seconds
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
