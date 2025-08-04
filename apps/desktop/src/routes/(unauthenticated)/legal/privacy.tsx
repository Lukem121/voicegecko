import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/(unauthenticated)/legal/privacy')({
  component: Privacy,
});

function Privacy() {
  return <div>Privacy</div>;
}
