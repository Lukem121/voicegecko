import type { ReactNode } from 'react';

import PollingAuthWrapper from '../../components/polling-wrapper';

type NoSessionLayoutProps = {
  readonly children: ReactNode;
};

export default function NoSessionLayout({ children }: NoSessionLayoutProps) {
  return <PollingAuthWrapper>{children}</PollingAuthWrapper>;
}
