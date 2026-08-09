import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/settings/models')({
  component: SettingsModelsRedirect,
});

function SettingsModelsRedirect() {
  return <Navigate replace to="/settings/engine-lab" />;
}
