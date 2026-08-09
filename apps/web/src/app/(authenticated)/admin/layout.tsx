import { getServerSession } from '@acme/auth/utils/get-session';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { APP_ROUTES } from '~/utils/app-routes';
import { AdminNav } from './_components/admin-nav';

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
    return redirect(APP_ROUTES.HOME);
  }

  return (
    <div className="mx-auto max-w-6xl px-4">
      <AdminNav />
      {children}
    </div>
  );
};

export default AppLayout;
