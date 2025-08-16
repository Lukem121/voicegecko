import { cn } from '@acme/ui/lib/utils';

interface SectionWrapperProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  id?: string;
  useXPadding?: boolean;
  useYPadding?: boolean;
}

export default function SectionWrapper({
  children,
  className,
  id,
  useXPadding = true,
  useYPadding = true,
}: SectionWrapperProps) {
  return (
    <section
      className={cn(
        'relative mx-auto max-w-6xl',
        useYPadding && 'py-10',
        useXPadding && 'px-4 md:px-6 lg:px-12',
        className
      )}
      id={id}
    >
      {children}
    </section>
  );
}
