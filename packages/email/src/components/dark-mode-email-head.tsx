import { Head } from '@react-email/components';

export const DarkModeEmailHead = () => (
  <Head>
    {/* Color scheme meta tags */}
    <meta content="light dark" name="color-scheme" />
    <meta content="light dark" name="supported-color-schemes" />

    {/* Dark mode logo switching and link styling */}
    <style type="text/css">{`
      @media (prefers-color-scheme: dark) {
        .logo.light {
          display: none !important;
        }
        .logo.dark {
          display: inline-block !important;
        }
        /* Improve link visibility in dark mode */
        a[style*="color: #2563eb"] {
          color: #60a5fa !important;
        }
        a[style*="color: #2563eb"]:hover {
          color: #93c5fd !important;
        }
      }
    `}</style>
  </Head>
);
