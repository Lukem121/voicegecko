import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/language")({
  component: SettingsLanguagePage,
});

function SettingsLanguagePage() {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <p className="text-muted-foreground">
        Choose the language for transcription.
      </p>
    </div>
  );
}
