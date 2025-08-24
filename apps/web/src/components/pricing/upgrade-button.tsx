'use client';

import { cn } from '@acme/ui/lib/utils';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useSubscriptionUpgrade } from '~/hooks/use-subscription-upgrade';
import { authClient } from '~/lib/auth/client';

export type UpgradeButtonProps = {
  planType: 'basic' | 'pro';
  isLoggedIn: boolean;
  isAnnual?: boolean;
  highlight?: boolean;
  className?: string;
  children: React.ReactNode;
};

/**
 * Static button for SSR - no client-side hooks
 */
function StaticUpgradeButton({
  highlight = false,
  className,
  children,
}: Omit<UpgradeButtonProps, 'isLoggedIn' | 'isAnnual' | 'planType'>) {
  return (
    <button
      className={cn(
        'inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-lg px-8 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        highlight
          ? 'bg-primary text-white hover:bg-primary/90'
          : 'bg-muted text-foreground hover:bg-muted/80',
        className
      )}
      type="button"
    >
      {children}
    </button>
  );
}

/**
 * Interactive button for client-side - uses hooks that need Suspense
 */
function InteractiveUpgradeButton({
  planType,
  isLoggedIn,
  isAnnual = false,
  highlight = false,
  className,
  children,
}: UpgradeButtonProps) {
  const router = useRouter();
  const { upgrade, isUpgrading } = useSubscriptionUpgrade({
    onSuccess: () => {
      // User will be redirected to Stripe, this likely won't execute
    },
    onError: () => {
      // Error handling is done in the hook via toasts
    },
  });

  // Detect if the logged-in user already has an active Pro subscription
  const [hasActivePro, setHasActivePro] = useState(false);
  const [isCheckingPro, setIsCheckingPro] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const checkProStatus = async () => {
      if (!isLoggedIn || planType !== 'pro') {
        return;
      }

      setIsCheckingPro(true);
      try {
        const result = await authClient.subscription.list();
        const subscriptions = result.data ?? [];
        const userHasPro = subscriptions.some(
          (subscription) =>
            subscription?.plan === 'voice gecko pro' &&
            (subscription?.status === 'active' ||
              subscription?.status === 'trialing')
        );

        if (!isCancelled) {
          setHasActivePro(userHasPro);
        }
      } catch {
        // Ignore errors here; upgrade flow will handle errors if user clicks
      } finally {
        if (!isCancelled) {
          setIsCheckingPro(false);
        }
      }
    };

    checkProStatus();
    return () => {
      isCancelled = true;
    };
  }, [isLoggedIn, planType]);

  const handleClick = async () => {
    // Basic plan always goes to download
    if (planType === 'basic') {
      router.push('/download');
      return;
    }

    // Pro plan - if not logged in, go to download
    if (!isLoggedIn) {
      router.push('/download');
      return;
    }

    // Pro plan - already on Pro, do nothing
    if (hasActivePro) {
      return;
    }

    // Pro plan - logged in, initiate upgrade
    await upgrade('voice gecko pro', isAnnual);
  };

  let displayText = children as React.ReactNode;
  if (isUpgrading) {
    displayText = 'Processing...';
  } else if (planType === 'pro' && isLoggedIn && hasActivePro) {
    displayText = "You're on Pro";
  }

  return (
    <button
      className={cn(
        'inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-lg px-8 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        highlight
          ? 'bg-primary text-white hover:bg-primary/90'
          : 'bg-muted text-foreground hover:bg-muted/80',
        isUpgrading && 'cursor-not-allowed opacity-75',
        className
      )}
      disabled={
        isUpgrading ||
        (planType === 'pro' && isLoggedIn && (hasActivePro || isCheckingPro))
      }
      onClick={handleClick}
      type="button"
    >
      {displayText}
    </button>
  );
}

/**
 * Smart upgrade button that handles different plan types and authentication states
 * Uses SSR-safe approach to avoid useSearchParams() issues
 */
export function UpgradeButton(props: UpgradeButtonProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // During SSR or before client hydration, show static button
  if (!isMounted) {
    return (
      <StaticUpgradeButton
        className={props.className}
        highlight={props.highlight}
      >
        {props.children}
      </StaticUpgradeButton>
    );
  }

  // After client hydration, show interactive button with Suspense
  return (
    <Suspense
      fallback={
        <StaticUpgradeButton
          className={props.className}
          highlight={props.highlight}
        >
          {props.children}
        </StaticUpgradeButton>
      }
    >
      <InteractiveUpgradeButton {...props} />
    </Suspense>
  );
}
