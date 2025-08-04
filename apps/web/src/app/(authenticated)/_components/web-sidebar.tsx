'use client';

import LogoSquare from '@acme/ui/components/logos/logo-square';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
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

interface NavigationSubItem {
  title: string;
  url: string;
}

interface NavigationItem {
  title: string;
  url: string;
  icon: LucideIcon;
  items?: NavigationSubItem[];
}

interface NavigationData {
  navMain: NavigationItem[];
}

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
    <Sidebar
      className="!top-auto !bottom-auto !left-auto !h-auto"
      collapsible="icon"
      variant="inset"
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <LogoSquare />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">VoiceGecko</span>
                <span className="truncate text-xs">Desktop Transcription</span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
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
