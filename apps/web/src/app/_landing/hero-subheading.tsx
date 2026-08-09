import { cn } from '@acme/ui/lib/utils';

type HeroSubheadingProps = {
  children: React.ReactNode;
  className?: string;
};

export default function HeroSubheading({
  children,
  className,
}: HeroSubheadingProps) {
  return (
    <p
      className={cn(
        'mt-0 mb-[10px] block text-pretty text-center text-base text-muted-foreground leading-[1.6] tracking-[-0.05em] md:text-lg dark:text-white/80',
        className
      )}
    >
      {children}
    </p>
  );
}
