import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/(unauthenticated)/legal/terms')({
  component: Terms,
});

function Terms() {
  return <div>TermsPage</div>;
}
