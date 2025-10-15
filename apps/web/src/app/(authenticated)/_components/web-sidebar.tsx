'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@acme/ui/components/ui/sidebar';
import { useQuery } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import { ChartBar, CreditCard, Package, User2, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTRPC } from '~/trpc/react';

type NavigationSubItem = {
  title: string;
  url: string;
};

type NavigationItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  items?: NavigationSubItem[];
};

type NavigationData = {
  navMain: NavigationItem[];
};

const data: NavigationData = {
  navMain: [
    {
      title: 'Usage',
      url: '/app/usage',
      icon: ChartBar,
    },
    {
      title: 'Plans',
      url: '/app/plans',
      icon: Package,
    },
    {
      title: 'Team',
      url: '/app/team',
      icon: Users,
    },
    {
      title: 'Billing',
      url: '/app/billing',
      icon: CreditCard,
    },
    {
      title: 'Profile',
      url: '/app/profile',
      icon: User2,
    },
  ],
};

export default function AppSidebar() {
  const pathname = usePathname();
  const trpc = useTRPC();
  const effectiveSubOptions =
    trpc.stripe.getEffectiveSubscription.queryOptions();
  const effectiveSubQuery = useQuery(effectiveSubOptions);
  const isTeam = effectiveSubQuery.data?.plan === 'voice gecko team';
  const baseItems = data.navMain.filter((i) => i.title !== 'Team');
  const teamItem = data.navMain.find((i) => i.title === 'Team');
  return (
    <Sidebar className="hidden md:flex" collapsible="none" variant="sidebar">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {baseItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      item.url === '/app'
                        ? pathname === '/app'
                        : pathname.startsWith(item.url)
                    }
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.items?.length ? (
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === subItem.url}
                          >
                            <Link href={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  ) : null}
                </SidebarMenuItem>
              ))}

              <AnimatePresence initial={false}>
                {isTeam && teamItem ? (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    initial={{ opacity: 0, y: -8 }}
                    key="team-link"
                    transition={{ duration: 0.18 }}
                  >
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={
                          teamItem.url === '/app'
                            ? pathname === '/app'
                            : pathname.startsWith(teamItem.url)
                        }
                      >
                        <Link href={teamItem.url}>
                          <teamItem.icon />
                          <span>{teamItem.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
