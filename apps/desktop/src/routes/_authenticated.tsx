/* eslint-disable @typescript-eslint/only-throw-error */

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { LucideLoader2 } from "lucide-react";

import { Separator } from "@acme/ui/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@acme/ui/components/ui/sidebar";

import { AppBreadcrumb } from "~/components/app-breadcrumb";
import { AppSidebar } from "~/components/app-sidebar";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) => {
    // Check if user is authenticated
    if (!context.auth.isLoading && !context.auth.isAuthenticated) {
      throw redirect({
        to: "/sign-in",
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const authContext = Route.useRouteContext().auth;

  // Show loading state while checking authentication
  if (authContext.isLoading) {
    console.log("Checking authentication...");
    return (
      <div className="flex h-screen items-center justify-center">
        <LucideLoader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  // User is authenticated, render the protected content with sidebar
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="!ml-0">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <AppBreadcrumb />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
