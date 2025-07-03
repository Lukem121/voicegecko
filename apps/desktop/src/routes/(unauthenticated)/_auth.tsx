import { Outlet } from "@tanstack/react-router";

import PollingAuthWrapper from "./-components/polling-wrapper";

export default function AuthLayout() {
  return (
    <div className="relative grid h-dvh flex-col items-center justify-center lg:max-w-none lg:px-0">
      <div className="absolute top-0 left-0 -z-10 h-full w-full overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 transform-gpu overflow-hidden blur-3xl sm:-top-80"
          aria-hidden="true"
        >
          <div
            className="to-primary-muted relative left-[calc(50%)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[45deg] bg-gradient-to-tr from-blue-400 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            style={{
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
            }}
          />
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-green-300 to-blue-800 opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
            style={{
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
            }}
          />
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full max-w-[400px] flex-col justify-center space-y-6">
          <PollingAuthWrapper>
            <Outlet />
          </PollingAuthWrapper>
        </div>
      </div>
    </div>
  );
}
