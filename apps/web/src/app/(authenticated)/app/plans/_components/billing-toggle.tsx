import { cn } from '@acme/ui/lib/utils';
import { motion } from 'framer-motion';

type BillingPeriod = 'monthly' | 'annual';

type BillingToggleProps = {
  selected: BillingPeriod;
  setSelected: (period: BillingPeriod) => void;
};

export const BillingToggle = ({
  selected,
  setSelected,
}: BillingToggleProps) => {
  const isYearly = selected === 'annual';

  return (
    <div className="flex justify-center">
      <div className="flex rounded-full border p-1">
        <button
          className={cn('relative z-0 px-4 py-2', isYearly ? 'z-1' : 'z-0')}
          onClick={() => setSelected('annual')}
          type="button"
        >
          {isYearly && (
            <motion.div
              className="absolute inset-0 rounded-full bg-neutral-900"
              initial={false}
              layoutId="toggleBackground"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
          <span
            className={cn(
              'relative block font-medium text-xs',
              isYearly ? 'text-white' : 'text-muted-foreground',
              'duration-200'
            )}
          >
            Yearly
            <span className="ml-2 font-semibold text-[10px] text-green-500">
              <span className="hidden lg:inline">Save </span>
              <span className="lg:hidden">-</span>20%
            </span>
          </span>
        </button>
        <button
          className={cn('relative z-0 px-4 py-2', isYearly ? 'z-0' : 'z-1')}
          onClick={() => setSelected('monthly')}
          type="button"
        >
          {!isYearly && (
            <motion.div
              className="absolute inset-0 rounded-full bg-neutral-900"
              initial={false}
              layoutId="toggleBackground"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
          <span
            className={cn(
              'relative block font-medium text-xs',
              isYearly ? 'text-muted-foreground' : 'text-white',
              'duration-200'
            )}
          >
            Monthly
          </span>
        </button>
      </div>
    </div>
  );
};
