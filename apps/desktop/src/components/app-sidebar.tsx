import { CopyButton } from '@acme/ui/components/copy';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@acme/ui/components/ui/avatar';
import { Button } from '@acme/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@acme/ui/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@acme/ui/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import { Link, useLocation } from '@tanstack/react-router';
import { open } from '@tauri-apps/plugin-shell';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  ChartBar,
  ChevronUp,
  CreditCard,
  ExternalLink,
  FileText,
  Gauge,
  Keyboard,
  LogOut,
  MessageCircle,
  Mic,
  Settings2,
  Wand2,
} from 'lucide-react';
import { useState } from 'react';
import { useSignOut } from '~/hooks/auth';
import { useAuthWithConnectivity } from '~/hooks/use-auth-with-connectivity';
import { useUpdateStore } from '~/stores/update.store';

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
  navSmartFeatures: NavigationItem[];
  navSecondary: NavigationItem[];
};

// Helper functions for link handling
const isExternalLink = (url: string) => {
  return url.startsWith('http') || url.startsWith('https');
};

const isSpecialLink = (url: string) => {
  return url.startsWith('#');
};

const handleLinkClick = async (
  url: string,
  setShowSupportDialog?: (show: boolean) => void
) => {
  if (url === '#plans') {
    const websiteUrl =
      import.meta.env.VITE_PUBLIC_VOICEGECKO_URL || 'https://www.voicegecko.dev';
    await open(`${websiteUrl}/app/plans`);
  } else if (url === '#support') {
    setShowSupportDialog?.(true);
  } else if (isExternalLink(url)) {
    await open(url);
  }
};

const shouldUseAsChild = (url: string) => {
  return !(isSpecialLink(url) || isExternalLink(url));
};

const data: NavigationData = {
  navMain: [
    {
      title: 'Recording',
      url: '/',
      icon: Mic,
    },
    {
      title: 'Dictations',
      url: '/dictations',
      icon: FileText,
    },
    {
      title: 'Dictionary',
      url: '/dictionary',
      icon: BookOpen,
    },
  ],
  navSmartFeatures: [
    {
      title: 'Smart Edit',
      url: '#coming-soon',
      icon: Wand2,
    },
  ],
  navSecondary: [
    {
      title: 'Support',
      url: '#plans',
      icon: CreditCard,
    },
    {
      title: 'Usage',
      url: '/usage',
      icon: ChartBar,
    },
    {
      title: 'Settings',
      url: '/settings',
      icon: Settings2,
      // Keeping sub-item structure for future use if needed
      // items: [
      //   {
      //     title: 'Keyboard Shortcuts',
      //     url: '/settings/shortcuts',
      //   },
      // ],
    },
    {
      title: 'Keyboard Shortcuts',
      url: '/settings/shortcuts',
      icon: Keyboard,
    },
  ],
};

const isDev = import.meta.env.DEV;

if (isDev) {
  data.navSecondary.splice(4, 0, {
    title: 'Speed & accuracy',
    url: '/settings/engine-lab',
    icon: Gauge,
  });
}

// Discord URL for feedback
const DISCORD_URL = 'https://discord.gg/wfMY47mUvM';

export function AppSidebar() {
  const auth = useAuthWithConnectivity();
  const user = auth.user;
  const signOut = useSignOut();
  const location = useLocation();
  const [showSupportDialog, setShowSupportDialog] = useState(false);

  // Update availability indicator for Settings menu
  const updateAvailable = !!useUpdateStore((s) => s.availableUpdate);

  const navSecondaryItems = data.navSecondary.filter((item) => {
    if (!user && (item.url === '/usage' || item.title === 'Usage')) {
      return false;
    }
    return true;
  });

  return (
    <Sidebar
      className="top-12 h-[calc(100svh-3rem)] border-border border-r"
      collapsible="icon"
      variant="inset"
    >
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
                      item.url === '/'
                        ? location.pathname === item.url
                        : location.pathname.startsWith(item.url)
                    }
                  >
                    <Link to={item.url}>
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
                            isActive={location.pathname === subItem.url}
                          >
                            <Link to={subItem.url}>
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
        <SidebarGroup>
          <SidebarGroupLabel>Post-Processing</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.navSmartFeatures.map((item) => {
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild={false}
                      className="cursor-not-allowed opacity-60"
                      isActive={false}
                      onClick={() => {
                        // Do nothing for coming soon items
                      }}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                      <span className="ml-auto text-[11px] text-muted-foreground">
                        Coming Soon
                      </span>
                    </SidebarMenuButton>
                    {item.items?.length ? (
                      <SidebarMenuSub>
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild={false}
                              isActive={false}
                            >
                              <div>
                                <span>{subItem.title}</span>
                              </div>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {navSecondaryItems.map((item) => {
                const isInternal = shouldUseAsChild(item.url);
                const showExternalIcon =
                  isSpecialLink(item.url) || isExternalLink(item.url);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild={isInternal}
                      className="cursor-pointer"
                      isActive={
                        isInternal &&
                        (location.pathname === item.url ||
                          location.pathname === `${item.url}/`)
                      }
                      onClick={
                        isInternal
                          ? undefined
                          : () =>
                              handleLinkClick(item.url, setShowSupportDialog)
                      }
                      size="sm"
                    >
                      {isInternal ? (
                        <Link to={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                          {item.title === 'Settings' && updateAvailable && (
                            <span
                              aria-hidden="true"
                              className="ml-auto inline-block h-2 w-2 rounded-full bg-red-500"
                            />
                          )}
                        </Link>
                      ) : (
                        <>
                          <item.icon />
                          <span>{item.title}</span>
                          {showExternalIcon && (
                            <ExternalLink className="!size-3 ml-auto" />
                          )}
                        </>
                      )}
                    </SidebarMenuButton>
                    {item.items?.length ? (
                      <SidebarMenuSub>
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location.pathname === subItem.url}
                            >
                              <Link to={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    size="lg"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage
                        alt={user.name ?? ''}
                        src={user.image ?? ''}
                      />
                      <AvatarFallback className="rounded-lg">
                        {user.name
                          ? user.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                          : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user.name}</span>
                      <span className="truncate text-xs">{user.email}</span>
                    </div>
                    <ChevronUp className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="bottom"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage
                          alt={user.name ?? ''}
                          src={user.image ?? ''}
                        />
                        <AvatarFallback className="rounded-lg">
                          {user.name
                            ? user.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                            : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                          {user.name}
                        </span>
                        <span className="truncate text-xs">{user.email}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/settings">
                      <Settings2 className="mr-2 size-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={async () => {
                      const websiteUrl =
                        import.meta.env.VITE_PUBLIC_VOICEGECKO_URL ||
                        'https://www.voicegecko.dev';
                      await open(`${websiteUrl}/app/billing`);
                    }}
                  >
                    <CreditCard className="mr-2 size-4" />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 size-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex flex-col gap-2 p-1 group-data-[collapsible=icon]:items-center">
                <SidebarMenuButton
                  className="cursor-pointer"
                  onClick={() => handleLinkClick('#plans')}
                  size="lg"
                >
                  <CreditCard />
                  <span>Support Voice Gecko</span>
                </SidebarMenuButton>
                <SidebarMenuButton asChild size="sm">
                  <Link search={{ redirect: null }} to="/sign-in">
                    <LogOut />
                    <span>Sign in</span>
                  </Link>
                </SidebarMenuButton>
              </div>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Support Dialog */}
      <Dialog onOpenChange={setShowSupportDialog} open={showSupportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Help & Support</DialogTitle>
            <DialogDescription>
              Need help? We're here to support you! Please reach out to us with
              any questions or issues.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="font-medium text-sm">Email Support</div>
              <div className="flex items-center space-x-2">
                <div className="flex-1 rounded bg-muted p-2 font-mono text-sm">
                  support@voicegecko.dev
                </div>
                <CopyButton text="support@voicegecko.dev" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-sm">Share Feedback</div>
              <Button
                className="w-full justify-start"
                onClick={async () => {
                  await open(DISCORD_URL);
                }}
                type="button"
                variant="outline"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Join our Discord Community
                <ExternalLink className="ml-auto h-3 w-3" />
              </Button>
              <p className="text-muted-foreground text-xs">
                Connect with other users and share your feedback or suggestions
                with our team.
              </p>
            </div>
            {user?.id && (
              <div className="space-y-2">
                <div className="font-medium text-sm">Your User ID</div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 rounded bg-muted p-2 font-mono text-sm">
                    {user.id}
                  </div>
                  <CopyButton text={user.id} />
                </div>
                <p className="text-muted-foreground text-xs">
                  Please include this User ID when contacting support to help us
                  assist you faster.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
