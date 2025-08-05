'use client';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@acme/ui/components/ui/select';
import { cn } from '@acme/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import {
  createContext,
  type FC,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Flag } from '~/components/flag';
import { useTRPC } from '~/trpc/react';

type Currency = 'usd' | 'eur' | 'gbp';

type CurrencyContext = {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
};

const CurrencyContext = createContext<CurrencyContext | null>(null);

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider.');
  }
  return context;
}

const CURRENCY_STORAGE_KEY = 'voicegecko-currency-preference';

export const CurrencyProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // Start with 'usd' as default to prevent SSR/hydration mismatches
  const [currency, setCurrency] = useState<Currency>('usd');
  const [hasCheckedLocalStorage, setHasCheckedLocalStorage] = useState(false);

  // Check localStorage on mount (client-side only)
  useEffect(() => {
    // Only run on client-side
    if (typeof window !== 'undefined') {
      const savedCurrency = localStorage.getItem(
        CURRENCY_STORAGE_KEY
      ) as Currency | null;
      if (savedCurrency && ['usd', 'eur', 'gbp'].includes(savedCurrency)) {
        setCurrency(savedCurrency);
      }
    }
    setHasCheckedLocalStorage(true);
  }, []);

  const trpc = useTRPC();
  const options = trpc.geolocation.getCurrency.queryOptions(undefined, {
    enabled: hasCheckedLocalStorage && currency === 'usd', // Only fetch if still default and localStorage checked
  });
  const query = useQuery(options);
  const resolvedCurrency = query.data ?? null;

  useEffect(() => {
    // Only update if we're still on default 'usd' and have a resolved currency
    if (currency === 'usd' && resolvedCurrency && hasCheckedLocalStorage) {
      setCurrency(resolvedCurrency);
    }
  }, [currency, resolvedCurrency, hasCheckedLocalStorage]);

  // Enhanced setCurrency function that saves to localStorage
  const handleSetCurrency = (newCurrency: Currency) => {
    setCurrency(newCurrency);
    localStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency);
  };

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency: handleSetCurrency }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const CurrencySelector = ({ className }: { className?: string }) => {
  const { currency, setCurrency } = useCurrency();
  return (
    <Select onValueChange={setCurrency} value={currency}>
      <SelectTrigger className={cn('w-[250px]', className)}>
        <SelectValue placeholder="Select a currency" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup className="text-sm">
          <SelectItem value="usd">
            <div className="flex items-center gap-3">
              <Flag className="h-4 w-4 rounded" code="US" /> <span>$ USD</span>
            </div>
          </SelectItem>
          <SelectItem value="eur">
            <div className="flex items-center gap-3">
              <Flag className="h-4 w-4 rounded" code="EU" /> <span>€ EUR</span>
            </div>
          </SelectItem>
          <SelectItem value="gbp">
            <div className="flex items-center gap-3">
              <Flag className="h-4 w-4 rounded" code="GB" /> <span>£ GBP</span>
            </div>
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
