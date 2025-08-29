import { getServerSession } from '@acme/auth/utils/get-session';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { APP_ROUTES } from '~/utils/app-routes';

type AppLayoutProperties = {
  readonly children: ReactNode;
};

const AppLayout = async ({ children }: AppLayoutProperties) => {
  const session = await getServerSession();

  if (!session?.user) {
    return redirect(APP_ROUTES.AUTH.SIGN_IN);
  }

  // MUST BE AN ADMIN
  if (session.user.role !== 'admin') {
    return redirect(APP_ROUTES.APP.ROOT);
  }

  return children;
};

export default AppLayout;
