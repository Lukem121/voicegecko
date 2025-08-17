import { cn } from '@acme/ui/lib/utils';

type EyebrowProps = {
  children: React.ReactNode;
  className?: string;
};

export default function Eyebrow({ children, className }: EyebrowProps) {
  return (
    <p
      className={cn(
        'mx-auto mb-[1.5em] block text-center font-semibold text-xs uppercase leading-[1.2] tracking-[0.09em]',
        className
      )}
    >
      {children}
    </p>
  );
}
