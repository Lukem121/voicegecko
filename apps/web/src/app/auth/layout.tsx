import { Suspense } from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
          <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-blue-600 border-b-2" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
