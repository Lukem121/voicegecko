'use client';

import { SidebarInset, SidebarProvider } from '@acme/ui/components/ui/sidebar';
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
        <SidebarInset className="!ml-0 !shadow-none">
          <header className="flex h-12 shrink-0 items-center justify-end gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <UserMenu />
          </header>
          <div className="flex flex-1 flex-col gap-4 pt-0">
            <div className="w-full max-w-6xl">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </SectionWrapper>
  );
}
