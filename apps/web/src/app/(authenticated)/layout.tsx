import { getServerSession } from '@acme/auth/utils/get-session';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { ImpersonationBanner } from '~/components/impersonation-banner';
import { APP_ROUTES } from '~/utils/app-routes';
import Footer from '../_landing/footer';
import Header from '../_landing/header';

type AppLayoutProperties = {
  readonly children: ReactNode;
};

const AppLayout = async ({ children }: AppLayoutProperties) => {
  const session = await getServerSession();

  if (!session?.user) {
    return redirect(APP_ROUTES.AUTH.SIGN_IN);
  }

  return (
    <div className="relative">
      <ImpersonationBanner session={session} />
      <Header />
      {children}
      <Footer />
    </div>
  );
};

export default AppLayout;
