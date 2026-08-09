import type { ReactNode } from 'react';
import Footer from '../_landing/footer';
import Header from '../_landing/header';
import RiveGeckoPopup from '../_landing/rive-gecko-popup';

export default function UnauthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden">
      <Header />
      {children}
      <Footer />
      <RiveGeckoPopup />
    </div>
  );
}
