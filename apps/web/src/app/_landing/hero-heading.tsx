import { cn } from '@acme/ui/lib/utils';

interface HeroHeadingProps {
  children: React.ReactNode;
  className?: string;
}

export default function HeroHeading({ children, className }: HeroHeadingProps) {
  return (
    <h1
      className={cn(
        'text-balance text-center font-semibold text-foreground leading-none tracking-[-0.02em]',
        className
      )}
      style={{
        fontSize: 'clamp(2rem, 1rem + 6vw, 4.6rem)',
      }}
    >
      {children}
    </h1>
  );
}
