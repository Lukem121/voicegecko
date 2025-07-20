"use client";

import type { Subscription } from "@better-auth/stripe";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Calendar, Loader2, RefreshCw, X } from "lucide-react";

import type { PriceWithMetadata } from "@acme/api/src/router/stripe.route";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@acme/ui/components/ui/alert";
import { Badge } from "@acme/ui/components/ui/badge";
import { Button } from "@acme/ui/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@acme/ui/components/ui/card";

import { useTRPC } from "~/trpc/react";
import { useCreateBillingPortalSession } from "../../_hooks/use-create-billing-portal-session";

interface BillingProps {
  prices: Record<string, PriceWithMetadata>;
  subscription: Subscription | null;
  error: {
    code?: string | undefined;
    message?: string | undefined;
    status: number;
    statusText: string;
  } | null;
}

interface AlertState {
  show: boolean;
  variant: "default" | "destructive";
  title: string;
  message: string;
}

const useRestoreSubscription = () => {
  const trpc = useTRPC();
  const options = trpc.stripe.restoreSubscription.mutationOptions();
  const mutation = useMutation(options);
  return mutation;
};

export default function Billing({ prices, subscription, error }: BillingProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [alertState, setAlertState] = useState<AlertState>({
    show: false,
    variant: "default",
    title: "",
    message: "",
  });

  const createBillingPortalSessionMutation = useCreateBillingPortalSession();
  const restoreSubscriptionMutation = useRestoreSubscription();

  const showAlert = (
    title: string,
    message: string,
    variant: "default" | "destructive" = "destructive",
  ) => {
    setAlertState({
      show: true,
      variant,
      title,
      message,
    });
  };

  const hideAlert = () => {
    setAlertState((prev) => ({ ...prev, show: false }));
  };

  // Helper to format price with currency
  const formatPrice = (price: PriceWithMetadata) => {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: price.currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return formatter.format(price.unitAmount / 100); // Convert from cents
  };

  // Helper to find the right price for a plan
  const findPriceForPlan = (
    planName: string,
    interval: "monthly" | "yearly",
  ) => {
    // Find price that matches the plan name and interval type
    const matchingPriceEntry = Object.entries(prices).find(([_, price]) => {
      return price.planName === planName && price.intervalType === interval;
    });

    return matchingPriceEntry ? matchingPriceEntry[1] : null;
  };

  // Determine the current subscription interval
  const getSubscriptionInterval = (): "monthly" | "yearly" => {
    if (!subscription?.periodStart || !subscription.periodEnd) return "monthly";

    const start = new Date(subscription.periodStart);
    const end = new Date(subscription.periodEnd);
    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

    // More than 300 days = yearly subscription
    return daysDiff > 300 ? "yearly" : "monthly";
  };

  // Get the display price for the current subscription
  const getCurrentSubscriptionPrice = () => {
    if (!subscription) return "N/A";

    const interval = getSubscriptionInterval();
    const price = findPriceForPlan(subscription.plan, interval);

    if (!price) return "Price unavailable";

    return `${formatPrice(price)}/${interval === "yearly" ? "year" : "month"}`;
  };

  // Handle error state
  if (error) {
    return (
      <div className="space-y-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-medium">Billing</h1>
          <p className="text-muted-foreground">
            Manage your subscription and billing information
          </p>
        </div>

        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Failed to Load Subscription Data</AlertTitle>
          <AlertDescription>
            {error.message ??
              `Failed to load subscription information (${error.status}: ${error.statusText})`}
          </AlertDescription>
        </Alert>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => router.refresh()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/app/plans")}
              >
                View Plans
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleManageSubscription = async () => {
    if (!subscription) {
      router.push("/app/plans");
      return;
    }

    try {
      setIsLoading(true);
      const result = await createBillingPortalSessionMutation.mutateAsync({
        returnUrl: "/app/billing",
      });

      if (result.url) {
        router.push(result.url);
      }
    } catch (error) {
      console.error("Error managing subscription:", error);
      showAlert("Billing Portal Error", "Failed to open billing portal.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreSubscription = async () => {
    if (!subscription?.stripeSubscriptionId) return;

    try {
      setIsRestoring(true);
      const result = await restoreSubscriptionMutation.mutateAsync({
        subscriptionId: subscription.stripeSubscriptionId,
      });

      if (result.success) {
        showAlert(
          "Subscription Restored",
          "Your subscription has been successfully restored and will continue as normal.",
          "default",
        );
        // Refresh after a short delay to show the success message
        setTimeout(() => {
          router.refresh();
        }, 2000);
      }
    } catch (error) {
      console.error("Error restoring subscription:", error);
      showAlert(
        "Restore Failed",
        "Failed to restore subscription. Please try again.",
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "N/A";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getPlanDisplayName = (planName: string) => {
    const displayNames: Record<string, string> = {
      "voice gecko pro": "Voice Gecko Pro",
      "voice gecko team": "Voice Gecko Team",
    };
    return displayNames[planName] ?? planName;
  };

  const isCanceling = subscription?.cancelAtPeriodEnd;
  const canRestore =
    subscription && isCanceling && subscription.status === "active";

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-medium">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Dynamic Alert */}
      {alertState.show && (
        <Alert variant={alertState.variant}>
          <AlertTriangle />
          <AlertTitle className="flex items-center justify-between">
            {alertState.title}
            <Button
              variant="ghost"
              size="sm"
              onClick={hideAlert}
              className="h-auto p-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertTitle>
          <AlertDescription>{alertState.message}</AlertDescription>
        </Alert>
      )}

      {/* Cancellation Alert with Restore Option */}
      {isCanceling && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Subscription Ending</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Your subscription will end on {formatDate(subscription.periodEnd)}
              . You can restore your subscription anytime before this date to
              continue your service.
            </p>
            {canRestore && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestoreSubscription}
                disabled={isRestoring}
                className="mt-2"
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Restore Subscription
                  </>
                )}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="mb-2 text-xl font-medium">
              Current Plan
            </CardTitle>
            <CardAction>
              {subscription ? (
                <Button
                  variant="outline"
                  onClick={handleManageSubscription}
                  disabled={isLoading}
                  className="w-44"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Manage Subscription"
                  )}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => router.push("/app/plans")}
                  className="w-44"
                >
                  Upgrade Plan
                </Button>
              )}
            </CardAction>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {subscription ? (
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-medium">
                {getPlanDisplayName(subscription.plan)}
              </h3>
              <Badge variant={isCanceling ? "destructive" : "secondary"}>
                {isCanceling
                  ? "Canceling"
                  : subscription.status === "trialing"
                    ? "Trial"
                    : "Active"}
              </Badge>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-medium">Free Plan</h3>
              <Badge variant="secondary">Active</Badge>
            </div>
          )}
          {subscription ? (
            <p className="text-muted-foreground text-sm">
              {getCurrentSubscriptionPrice()} •
              {isCanceling
                ? ` Cancels on ${formatDate(subscription.periodEnd)}`
                : ` Next billing date: ${formatDate(subscription.periodEnd)}`}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              You're on the free plan with limited features
            </p>
          )}
        </CardContent>
      </Card>

      {/* Subscription Details */}
      {subscription && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-medium">
              Subscription Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-x-20 gap-y-3 md:grid-cols-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Status</span>
                <span className="text-sm font-medium">
                  {subscription.status === "trialing"
                    ? "Trial"
                    : isCanceling
                      ? "Canceling"
                      : "Active"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">
                  Billing Period
                </span>
                <span className="text-sm font-medium capitalize">
                  {getSubscriptionInterval()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">
                  Current period start
                </span>
                <span className="text-sm font-medium">
                  {formatDate(subscription.periodStart)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">
                  Current period end
                </span>
                <span className="text-sm font-medium">
                  {formatDate(subscription.periodEnd)}
                </span>
              </div>
              {subscription.seats !== undefined && subscription.seats > 1 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Seats</span>
                  <span className="text-sm font-medium">
                    {subscription.seats}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing History Note */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            To view your billing history, download invoices, or update payment
            methods, click "Manage Subscription" above to access the Stripe
            billing portal.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
