import { Head } from '@react-email/components';

export const DarkModeEmailHead = () => (
  <Head>
    {/* Color scheme meta tags */}
    <meta content="light dark" name="color-scheme" />
    <meta content="light dark" name="supported-color-schemes" />

    {/* Dark mode logo switching styles */}
    <style type="text/css">{`
      @media (prefers-color-scheme: dark) {
        .logo.light {
          display: none !important;
        }
        .logo.dark {
          display: inline-block !important;
        }
      }
    `}</style>
  </Head>
);
