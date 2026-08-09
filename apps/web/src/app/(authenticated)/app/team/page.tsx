import type { RouterOutputs } from '@acme/api/src/root';
import { caller } from '~/trpc/server';
import TeamClient from './_components/team-client';

export default async function TeamPage() {
  const context = await caller.team.getMemberContext();

  let members: RouterOutputs['team']['getMembers'] = [];
  let seats:
    | RouterOutputs['team']['getSeatStatus']
    | { used: number; total: number; available: number } = {
    used: 0,
    total: 0,
    available: 0,
  };

  if (context.role === 'owner') {
    const [m, s] = await Promise.all([
      caller.team.getMembers(),
      caller.team.getSeatStatus(),
    ]);
    members = m;
    seats = s;
  }

  return (
    <TeamClient
      initialContext={context}
      initialMembers={members}
      initialSeats={seats}
    />
  );
}
