'use client';

import { Button } from '@acme/ui/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@acme/ui/components/ui/popover';
import { SidebarProvider } from '@acme/ui/components/ui/sidebar';
import { useQuery } from '@tanstack/react-query';
import {
  ChartBar,
  CreditCard,
  Package,
  PanelLeftIcon,
  User2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import SectionWrapper from '~/app/_landing/section-wrapper';
import { UserMenu } from '../_components/user-menu';
import AppSidebar from '../_components/web-sidebar';
import { authClient } from '~/lib/auth/client';
import { useTRPC } from '~/trpc/react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session } = authClient.useSession();
  const trpc = useTRPC();
  const effectiveSubOptions = trpc.stripe.getEffectiveSubscription.queryOptions();
  const subscriptionQuery = useQuery({
    ...effectiveSubOptions,
    enabled: !!session?.user,
  });

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    if (subscriptionQuery.isLoading) {
      return;
    }

    const hasActiveSubscription = Boolean(subscriptionQuery.data);
    const isPlansPage = pathname.startsWith('/app/plans');

    if (!hasActiveSubscription && !isPlansPage) {
      router.replace('/app/plans');
    }
  }, [pathname, router, session?.user, subscriptionQuery.data, subscriptionQuery.isLoading]);

  // Navigation links array for mobile popover menu
  const navigationLinks = [
    {
      href: '/app/usage',
      label: 'Usage',
      icon: ChartBar,
      isActive: pathname === '/app/usage' || pathname.startsWith('/app/usage'),
    },
    {
      href: '/app/plans',
      label: 'Plans',
      icon: Package,
      isActive: pathname === '/app/plans' || pathname.startsWith('/app/plans'),
    },
    {
      href: '/app/billing',
      label: 'Billing',
      icon: CreditCard,
      isActive:
        pathname === '/app/billing' || pathname.startsWith('/app/billing'),
    },
    {
      href: '/app/profile',
      label: 'Profile',
      icon: User2,
      isActive:
        pathname === '/app/profile' || pathname.startsWith('/app/profile'),
    },
    {
      href: '/app/team',
      label: 'Team',
      icon: Users,
      isActive: pathname === '/app/team' || pathname.startsWith('/app/team'),
    },
  ];

  return (
    <SectionWrapper
      className="px-4 pt-4"
      useXPadding={false}
      useYPadding={false}
    >
      <SidebarProvider>
        <AppSidebar />
        <main className="flex flex-1 flex-col">
          <header className="flex h-12 shrink-0 items-center justify-between gap-2 sm:px-4">
            <div className="flex items-center">
              {/* Mobile navigation popover */}
              <Popover onOpenChange={setMobileMenuOpen} open={mobileMenuOpen}>
                <PopoverTrigger asChild>
                  <Button
                    className="-ml-1.5 size-7 md:hidden"
                    size="icon"
                    variant="ghost"
                  >
                    <PanelLeftIcon />
                    <span className="sr-only">Toggle Sidebar</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-48 p-1 md:hidden">
                  <div className="flex flex-col gap-1">
                    {navigationLinks.map((link) => {
                      const IconComponent = link.icon;
                      return (
                        <Link
                          className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                            link.isActive
                              ? 'bg-accent font-medium text-accent-foreground'
                              : 'text-foreground'
                          }`}
                          href={link.href}
                          key={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <IconComponent className="size-4 shrink-0" />
                          <span>{link.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <UserMenu />
          </header>
          <div className="flex flex-1 flex-col gap-4 pt-0 sm:px-4">
            <div className="w-full max-w-6xl">{children}</div>
          </div>
        </main>
      </SidebarProvider>
    </SectionWrapper>
  );
}
