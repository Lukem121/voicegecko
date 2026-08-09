import { openUrl } from '@tauri-apps/plugin-opener';

export default function TermsAndPrivacyNotice() {
  return (
    <p className="px-8 text-center text-muted-foreground text-sm">
      By continuing, you agree to our{' '}
      <button
        className="cursor-pointer underline underline-offset-4 hover:text-primary"
        onClick={() =>
          openUrl('https://www.voicegecko.dev/terms/terms-of-service')
        }
        type="button"
      >
        Terms of Service
      </button>{' '}
      and{' '}
      <button
        className="cursor-pointer underline underline-offset-4 hover:text-primary"
        onClick={() =>
          openUrl('https://www.voicegecko.dev/terms/privacy-policy')
        }
        type="button"
      >
        Privacy Policy
      </button>
      .
    </p>
  );
}
