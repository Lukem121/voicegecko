# Dark mode aware logos (React Email)

This email package implements “dark mode aware” logos by **rendering two images** (one for light mode, one for dark mode) and then using a CSS media query (`prefers-color-scheme: dark`) to **swap which one is visible** in clients that support dark mode styling.

The implementation lives in:

- `packages/email/src/components/dark-mode-email-head.tsx`
- `packages/email/src/components/dark-mode-aware-logo.tsx`
- `packages/email/src/components/dark-mode-aware-logo-full.tsx`

## How it works (exact mechanism)

### 1) Render both logos in the markup

`DarkModeAwareLogo` and `DarkModeAwareLogoFull` both render:

- A **light** logo wrapped in a container with the classes: `logo light`
- A **dark** logo wrapped in a container with the classes: `logo dark`
- The **dark** logo wrapper is hidden by default with an inline style: `display: none`

Key idea: **If a mail client does not support dark-mode CSS**, it will simply show the light logo (because the dark one is hard-hidden by default).

### 2) Add a dark-mode-only CSS rule that flips visibility

`DarkModeEmailHead` injects two things into the email `<head>`:

1) Meta tags that advertise support for light/dark color schemes:

```html
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
```

2) A `<style>` block with a media query:

```css
@media (prefers-color-scheme: dark) {
  .logo.light {
    display: none !important;
  }
  .logo.dark {
    display: inline-block !important;
  }
}
```

Important detail: the CSS uses `!important` so it can override the dark logo’s inline `style={{ display: 'none' }}` when the client is in dark mode.

### 3) Include the head component in every email template

Templates include `<DarkModeEmailHead />` near the top of the document, inside `<Html>`, so the meta tags + dark-mode CSS are present for the entire email.

If you forget this step, the logo components will still render both images, but the dark variant will **never** become visible (because it’s hidden by default).

## “Copy this pattern” recipe (for another project/agent)

### Step A — Create a head component that injects dark-mode CSS

Create a component like `DarkModeEmailHead` that renders a React Email `Head`:

```tsx
import { Head } from '@react-email/components';

export const DarkModeEmailHead = () => (
  <Head>
    <meta content="light dark" name="color-scheme" />
    <meta content="light dark" name="supported-color-schemes" />

    <style type="text/css">{`
      @media (prefers-color-scheme: dark) {
        .logo.light { display: none !important; }
        .logo.dark { display: inline-block !important; }
      }
    `}</style>
  </Head>
);
```

### Step B — Create a logo component that renders both variants

Create a component that:

- Wraps the light variant in `.logo.light`
- Wraps the dark variant in `.logo.dark`
- Hides the dark wrapper by default with inline `display: none`

```tsx
import { Img } from '@react-email/components';

export const DarkModeAwareLogo = ({
  lightModeUrl,
  darkModeUrl,
  alt = 'YourBrand',
  height = '32',
}: {
  lightModeUrl: string;
  darkModeUrl: string;
  alt?: string;
  height?: string;
}) => (
  <>
    <span className="logo light">
      <Img alt={alt} height={height} src={lightModeUrl} />
    </span>

    <span className="logo dark" style={{ display: 'none' }}>
      <Img alt={alt} height={height} src={darkModeUrl} />
    </span>
  </>
);
```

### Step C — Use both in every email template

In each email template:

- Render `<DarkModeEmailHead />` inside `<Html>`
- Render `<DarkModeAwareLogo ... />` wherever the logo belongs

```tsx
import { Html, Tailwind } from '@react-email/components';
import { DarkModeEmailHead } from './dark-mode-email-head';
import { DarkModeAwareLogo } from './dark-mode-aware-logo';

export const MyEmail = () => (
  <Tailwind>
    <Html>
      <DarkModeEmailHead />
      <DarkModeAwareLogo
        lightModeUrl="https://…/logo-light.png"
        darkModeUrl="https://…/logo-dark.png"
      />
      {/* rest of email */}
    </Html>
  </Tailwind>
);
```

## Notes and gotchas (email-client reality)

- **Default behavior matters**: The dark logo is hidden inline so that *unsupported clients* see only the light logo (no duplicate logos).
- **`!important` is intentional**: It ensures the dark-mode stylesheet can override the inline `display: none` used as the default.
- **Host images over HTTPS**: Email clients must be able to fetch both images; keep them public and stable.
- **Use two real assets**: Some clients “invert” colors in dark mode in ways that can make a single logo look bad. Swapping to a purpose-built dark logo avoids that.
- **Head styles aren’t universal**: Not every client honors `<style>` in `<head>` or `prefers-color-scheme`. The fallback is still acceptable: the light logo remains visible.

## What’s custom to VoiceGecko

- `DarkModeAwareLogoFull` is just a “full / wordmark” variant with different default URLs and default height.
- `DarkModeEmailHead` also includes a small dark-mode-only link color adjustment, but the logo swap works independently of that.

