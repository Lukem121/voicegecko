import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { open } from "@tauri-apps/plugin-shell";
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
} from "lucide-react";

import { CopyButton } from "@acme/ui/components/copy";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@acme/ui/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@acme/ui/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@acme/ui/components/ui/dropdown-menu";
import { Progress } from "@acme/ui/components/ui/progress";
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
} from "@acme/ui/components/ui/sidebar";

import { useSignOut } from "~/hooks/auth";
import { useAuthWithConnectivity } from "~/hooks/use-auth-with-connectivity";
import { trpc } from "~/trpc";

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
  navSecondary: NavigationItem[];
}

// Helper functions for link handling
const isExternalLink = (url: string) => {
  return url.startsWith("http") || url.startsWith("https");
};

const isSpecialLink = (url: string) => {
  return url.startsWith("#");
};

const handleLinkClick = async (
  url: string,
  setShowSupportDialog?: (show: boolean) => void,
) => {
  if (url === "#plans") {
    const websiteUrl =
      import.meta.env.VITE_PUBLIC_VOICEGECKO_URL || "https://www.voicegecko.io";
    await open(`${websiteUrl}/app/plans`);
  } else if (url === "#support") {
    setShowSupportDialog?.(true);
  } else if (isExternalLink(url)) {
    await open(url);
  }
};

const shouldUseAsChild = (url: string) => {
  return !isSpecialLink(url) && !isExternalLink(url);
};

const data: NavigationData = {
  navMain: [
    {
      title: "Recording",
      url: "/",
      icon: Mic,
    },
    {
      title: "Transcriptions",
      url: "/transcriptions",
      icon: FileText,
    },
    {
      title: "Dictionary",
      url: "/dictionary",
      icon: BookOpen,
    },
  ],
  navSecondary: [
    {
      title: "Plans",
      url: "#plans",
      icon: CreditCard,
    },
    {
      title: "Usage",
      url: "/usage",
      icon: ChartBar,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
      items: [
        {
          title: "Keyboard Shortcuts",
          url: "/settings/shortcuts",
        },
      ],
    },
    {
      title: "Help & Support",
      url: "#support",
      icon: HelpCircle,
    },
  ],
};

const isDev = import.meta.env.DEV;

if (isDev) {
  data.navSecondary[2]!.items?.push({
    title: "Quality",
    url: "/settings/models",
  });
}

export function AppSidebar() {
  const auth = useAuthWithConnectivity();
  const user = auth.user;
  const signOut = useSignOut();
  const location = useLocation();
  const [showSupportDialog, setShowSupportDialog] = useState(false);

  // Fetch usage status
  const { data: usageStatus } = useQuery({
    ...trpc.usage.getStatus.queryOptions(),
    refetchInterval: 60000, // Refetch every minute
    enabled: !!user,
  });

  // Check if user is on free plan (no subscription)
  const isFreePlan = usageStatus && !usageStatus.isUnlimited;
  const usagePercentage = isFreePlan
    ? (usageStatus.wordsUsed / usageStatus.wordsLimit) * 100
    : 0;

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="border-border top-12 h-[calc(100svh-3rem)] border-r"
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
                      item.url === "/"
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
                      size="sm"
                      isActive={
                        isInternal &&
                        (item.url === "/"
                          ? location.pathname === item.url
                          : location.pathname.startsWith(item.url))
                      }
                      onClick={
                        !isInternal
                          ? () =>
                              handleLinkClick(item.url, setShowSupportDialog)
                          : undefined
                      }
                      className="cursor-pointer"
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
                            <ExternalLink className="ml-auto !size-3" />
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
        {/* Usage Progress Bar for Free Users */}
        {isFreePlan && (
          <div className="mb-4 px-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Weekly Usage</span>
                <span className="font-medium">
                  {usageStatus.wordsUsed.toLocaleString()} /{" "}
                  {usageStatus.wordsLimit.toLocaleString()}
                </span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
              {usagePercentage >= 90 && (
                <p className="text-xs text-amber-600">
                  {usagePercentage >= 100 ? (
                    <>
                      Limit reached.{" "}
                      <button
                        onClick={async () => {
                          const websiteUrl =
                            import.meta.env.VITE_PUBLIC_VOICEGECKO_URL ||
                            "https://www.voicegecko.io";
                          await open(`${websiteUrl}/app/plans`);
                        }}
                        className="cursor-pointer underline"
                      >
                        Upgrade to Pro.
                      </button>
                    </>
                  ) : (
                    "Approaching usage limit."
                  )}
                </p>
              )}
            </div>
          </div>
        )}

        {/* User Menu */}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={user?.image ?? ""}
                      alt={user?.name ?? ""}
                    />
                    <AvatarFallback className="rounded-lg">
                      {user?.name
                        ? user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                        : "U"}
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
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage
                        src={user?.image ?? ""}
                        alt={user?.name ?? ""}
                      />
                      <AvatarFallback className="rounded-lg">
                        {user?.name
                          ? user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                          : "U"}
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
                  onClick={async () => {
                    const websiteUrl =
                      import.meta.env.VITE_PUBLIC_VOICEGECKO_URL ||
                      "https://www.voicegecko.io";
                    await open(`${websiteUrl}/app/billing`);
                  }}
                  className="cursor-pointer"
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
      <Dialog open={showSupportDialog} onOpenChange={setShowSupportDialog}>
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
              <label className="text-sm font-medium">Email Support</label>
              <div className="flex items-center space-x-2">
                <div className="bg-muted flex-1 rounded p-2 font-mono text-sm">
                  support@voicegecko.io
                </div>
                <CopyButton text="support@voicegecko.io" />
              </div>
            </div>
            {user?.id && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Your User ID</label>
                <div className="flex items-center space-x-2">
                  <div className="bg-muted flex-1 rounded p-2 font-mono text-sm">
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
