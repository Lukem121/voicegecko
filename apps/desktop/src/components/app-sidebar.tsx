import { CopyButton } from '@acme/ui/components/copy';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@acme/ui/components/ui/avatar';
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
import { Progress } from '@acme/ui/components/ui/progress';
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
  useSidebar,
} from '@acme/ui/components/ui/sidebar';
import { useQuery } from '@tanstack/react-query';
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
  HelpCircle,
  LogOut,
  Mic,
  Settings2,
  Wand2,
} from 'lucide-react';
import { useState } from 'react';

import { useSignOut } from '~/hooks/auth';
import { useAuthWithConnectivity } from '~/hooks/use-auth-with-connectivity';
import { trpc } from '~/trpc';

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
  navSmartFeatures: NavigationItem[];
  navSecondary: NavigationItem[];
}

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
      import.meta.env.VITE_PUBLIC_VOICEGECKO_URL || 'https://www.voicegecko.io';
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
      title: 'Transcriptions',
      url: '/transcriptions',
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
      title: 'Plans',
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
      items: [
        {
          title: 'Keyboard Shortcuts',
          url: '/settings/shortcuts',
        },
      ],
    },
    {
      title: 'Help & Support',
      url: '#support',
      icon: HelpCircle,
    },
  ],
};

const isDev = import.meta.env.DEV;

if (isDev) {
  data.navSecondary[2]?.items?.push({
    title: 'Quality',
    url: '/settings/models',
  });
}

// Circular Progress Component
interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

function CircularProgress({
  percentage,
  size = 32,
  strokeWidth = 4,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg className="-rotate-90 transform" height={size} width={size}>
        <title>Progress indicator showing {percentage}% completion</title>
        {/* Background circle */}
        <circle
          className="text-muted-foreground/20"
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          className="text-primary transition-all duration-300 ease-in-out"
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </svg>
      {/* Percentage text in center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-medium text-[10px]">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const auth = useAuthWithConnectivity();
  const user = auth.user;
  const signOut = useSignOut();
  const location = useLocation();
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const { state: sidebarState } = useSidebar();

  // Fetch usage status
  const { data: usageStatus } = useQuery({
    ...trpc.usage.getStatus.queryOptions(),
    refetchInterval: 60_000, // Refetch every minute
    enabled: !!user,
  });

  // Check if user is on free plan (no subscription)
  const isFreePlan = usageStatus && !usageStatus.isUnlimited;
  const usagePercentage = isFreePlan
    ? (usageStatus.wordsUsed / usageStatus.wordsLimit) * 100
    : 0;

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
              {data.navSecondary.map((item) => {
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
                        (item.url === '/'
                          ? location.pathname === item.url
                          : location.pathname.startsWith(item.url))
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
        {/* Usage Progress for Free Users */}
        {isFreePlan && (
          <div className="mb-4 px-2">
            {sidebarState === 'expanded' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Weekly Usage</span>
                  <span className="font-medium">
                    {usageStatus.wordsUsed.toLocaleString()} /{' '}
                    {usageStatus.wordsLimit.toLocaleString()}
                  </span>
                </div>
                <Progress className="h-2" value={usagePercentage} />
                {usagePercentage >= 90 && (
                  <p className="text-amber-600 text-xs">
                    {usagePercentage >= 100 ? (
                      <>
                        Limit reached.{' '}
                        <button
                          className="cursor-pointer underline"
                          onClick={async () => {
                            const websiteUrl =
                              import.meta.env.VITE_PUBLIC_VOICEGECKO_URL ||
                              'https://www.voicegecko.io';
                            await open(`${websiteUrl}/app/plans`);
                          }}
                          type="button"
                        >
                          Upgrade to Pro.
                        </button>
                      </>
                    ) : (
                      'Approaching usage limit.'
                    )}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex justify-center">
                <CircularProgress percentage={usagePercentage} />
              </div>
            )}
          </div>
        )}

        {/* User Menu */}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  size="lg"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      alt={user?.name ?? ''}
                      src={user?.image ?? ''}
                    />
                    <AvatarFallback className="rounded-lg">
                      {user?.name
                        ? user.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                        : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.name}</span>
                    <span className="truncate text-xs">{user?.email}</span>
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
                        alt={user?.name ?? ''}
                        src={user?.image ?? ''}
                      />
                      <AvatarFallback className="rounded-lg">
                        {user?.name
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
                        {user?.name}
                      </span>
                      <span className="truncate text-xs">{user?.email}</span>
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
                      'https://www.voicegecko.io';
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
                  support@voicegecko.io
                </div>
                <CopyButton text="support@voicegecko.io" />
              </div>
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
