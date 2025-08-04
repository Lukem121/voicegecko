import type { ReactNode } from 'react';

import PollingAuthWrapper from '../../components/polling-wrapper';

interface NoSessionLayoutProps {
  readonly children: ReactNode;
}

export default function NoSessionLayout({ children }: NoSessionLayoutProps) {
  return <PollingAuthWrapper>{children}</PollingAuthWrapper>;
}
