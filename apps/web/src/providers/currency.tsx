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
import { useRouter } from 'next/navigation';
import {
  createContext,
  type FC,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Flag } from '~/components/flag';
import type { Currency } from '~/server/schemas/currency';
import { api, type RouterOutputs } from '~/trpc/react';

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

export const CurrencyProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const utils = api.useUtils();
  const router = useRouter();
  const { data: location, isLoading } = api.geolocation.get.useQuery();

  const geoCurrency = location?.currency;

  const getInitialCurrency = (): Currency => {
    if (typeof window !== 'undefined') {
      const cookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('currency='));
      if (cookie) {
        const value = cookie.split('=')[1];
        if (value === 'usd' || value === 'eur' || value === 'gbp') {
          return value;
        }
      }
    }
    return 'usd';
  };

  const [currency, setCurrencyState] = useState<Currency>(getInitialCurrency);

  useEffect(() => {
    if (!isLoading && geoCurrency !== undefined) {
      const validatedCurrency = validateCurrency(geoCurrency, location);
      if (validatedCurrency) {
        setCurrency(validatedCurrency);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, location, geoCurrency]);

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    if (typeof window !== 'undefined') {
      document.cookie = `currency=${newCurrency}; path=/; max-age=${
        60 * 60 * 24 * 365
      }`; // Expires in 1 year
    }

    void utils.invalidate();
    router.refresh();
  };

  const contextValue = useMemo<CurrencyContext>(
    () => ({
      currency,
      setCurrency,
    }),
    [currency]
  );

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const CurrencySelect = ({ className }: { className?: string }) => {
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

const validateCurrency = (
  currency: string,
  location?: RouterOutputs['geolocation']['get']
): Currency | null => {
  if (currency === 'usd' || currency === 'eur' || currency === 'gbp') {
    return currency;
  }

  if (location === undefined) {
    return null;
  }

  if (location.country_code === 'GB') {
    return 'gbp';
  }

  // Lets check if they are in the EU
  if (location.continent_code === 'EU') {
    return 'eur';
  }

  // North America
  if (location.continent_code === 'NA') {
    return 'usd';
  }

  return null;
};
