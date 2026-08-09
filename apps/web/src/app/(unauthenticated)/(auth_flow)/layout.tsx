import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Suspense } from 'react';

type AuthLayoutProps = {
  readonly children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <>
      {/* Fixed gradient backgrounds that won't interfere with header */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          aria-hidden="true"
          className="sm:-top-80 pointer-events-none absolute inset-x-0 transform-gpu overflow-hidden blur-[120px]"
        >
          <div
            className="-translate-x-1/2 relative left-[calc(50%)] aspect-[1155/678] w-[36.125rem] rotate-[45deg] bg-gradient-to-tr from-[#6E9C4A] via-[#6E9C4A]/70 to-primary-muted opacity-25 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            style={{
              clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            }}
          />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-[calc(100%-13rem)] transform-gpu overflow-hidden blur-[120px] sm:top-[calc(100%-30rem)]"
        >
          <div
            className="-translate-x-1/2 relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] bg-gradient-to-tr from-[#6E9C4A]/70 to-[#6E9C4A]/90 opacity-25 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
            style={{
              clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            }}
          />
        </div>
      </div>

      {/* Main auth content */}
      <div className="relative grid min-h-[calc(100vh-12rem)] flex-col items-center justify-center lg:max-w-none lg:px-0">
        <div className="lg:p-8">
          <div className="mx-auto flex w-full max-w-[400px] flex-col justify-center space-y-6">
            <Suspense fallback={<Loader2 className="h-4 w-4 animate-spin" />}>
              {children}
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
