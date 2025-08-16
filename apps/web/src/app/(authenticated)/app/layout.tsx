'use client';

import { SidebarProvider } from '@acme/ui/components/ui/sidebar';
import SectionWrapper from '~/app/_landing/section-wrapper';
import { UserMenu } from '../_components/user-menu';
import AppSidebar from '../_components/web-sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SectionWrapper
      className="px-4 pt-4"
      useXPadding={false}
      useYPadding={false}
    >
      <SidebarProvider>
        <AppSidebar />
        <main className="flex flex-1 flex-col">
          <header className="flex h-12 shrink-0 items-center justify-end gap-2 px-4">
            <UserMenu />
          </header>
          <div className="flex flex-1 flex-col gap-4 px-4 pt-0">
            <div className="w-full max-w-6xl">{children}</div>
          </div>
        </main>
      </SidebarProvider>
    </SectionWrapper>
  );
}
