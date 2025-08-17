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
import type { LucideIcon } from 'lucide-react';
import { ChartBar, CreditCard, Package, User2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
  return (
    <Sidebar collapsible="none" variant="sidebar">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.navMain.map((item) => (
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
