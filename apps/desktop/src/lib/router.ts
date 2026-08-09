import { log } from '@acme/observability/log';

type NavigateOptions = {
  to: string;
  params?: Record<string, string | number | boolean | null | undefined>;
  search?: Record<string, string | number | boolean | null | undefined>;
  replace?: boolean;
};

type NavigateFn = (opts: NavigateOptions) => Promise<void>;

let navigateFn: NavigateFn | null = null;
const pending: NavigateOptions[] = [];

export function setNavigator(fn: NavigateFn): void {
  navigateFn = fn;
  // Flush any pending navigations
  if (pending.length > 0) {
    const items = pending.splice(0, pending.length);
    for (const item of items) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      navigate(item);
    }
  }
}

export async function navigate(opts: NavigateOptions): Promise<void> {
  try {
    if (navigateFn) {
      await navigateFn(opts);
      return;
    }
    // Router not ready yet; queue the navigation
    pending.push(opts);
  } catch (error) {
    log.error(error, 'Navigation failed via router, falling back to location');
    try {
      window.location.href = opts.to;
    } catch (e) {
      log.error(e, 'Navigation fallback failed');
    }
  }
}
