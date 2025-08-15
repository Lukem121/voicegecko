import { cn } from '@acme/ui/lib/utils';

interface SectionHeaderProps {
  eyebrow: string;
  heading: string;
  description: string;
  headingSize?: 'lg' | 'xl';
  descriptionWidth?: 'normal' | 'wide';
  cta?: React.ReactNode;
  className?: string;
}

export default function SectionHeader({
  eyebrow,
  heading,
  description,
  headingSize = 'lg',
  descriptionWidth = 'normal',
  cta,
  className,
}: SectionHeaderProps) {
  const headingSizeClasses = {
    lg: 'text-3xl tracking-[-0.04em] md:text-5xl',
    xl: 'text-4xl tracking-[-0.05em] md:text-5xl',
  };

  const descriptionWidthClasses = {
    normal: 'max-w-2xl',
    wide: 'max-w-3xl',
  };

  return (
    <div className={cn('text-center', className)}>
      <p className="text-primary">{eyebrow}</p>
      <h2
        className={cn(
          'mt-2 font-hero font-semibold',
          headingSizeClasses[headingSize]
        )}
      >
        {heading}
      </h2>
      <p
        className={cn(
          'mx-auto mt-3 text-pretty text-muted-foreground md:text-lg',
          descriptionWidthClasses[descriptionWidth]
        )}
      >
        {description}
      </p>
      {cta && <div className="mt-6 flex justify-center">{cta}</div>}
    </div>
  );
}
