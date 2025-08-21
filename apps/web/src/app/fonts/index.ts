import { Plus_Jakarta_Sans } from 'next/font/google';
import localFont from 'next/font/local';

export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta-sans',
  weight: 'variable',
});

export const roobert = localFont({
  src: [
    {
      path: '../fonts/Roobert/roobert-regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/Roobert/roobert-medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../fonts/Roobert/roobert-semibold.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
  variable: '--font-sans',
});
