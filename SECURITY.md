# Security Policy

## Supported versions

Security fixes are applied to the latest `main` branch of this repository and to the hosted service at [voicegecko.dev](https://www.voicegecko.dev).

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report privately to:

- **Email:** security@voicegecko.dev

Include as much detail as you can (steps to reproduce, affected component, impact). We will acknowledge receipt and work with you on a fix and disclosure timeline.

For general product security practices, see [voicegecko.dev/terms/security-policy](https://www.voicegecko.dev/terms/security-policy).

Community conduct is covered by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Secrets and credentials

- Never commit `.env` files or private keys. Example env files must use placeholders only.
- Official release signing keys, Stripe live keys, and similar secrets belong in GitHub Actions secrets / your local environment — not in the repository.
- Before making this repository public, scan full history with `gitleaks detect`. Known intentional placeholders (`sk_test_placeholder`, `sk-your-key-here`) are allowlisted in [`.gitleaks.toml`](.gitleaks.toml).
- Treat any secret that ever appeared in git history as compromised — rotate it even if it was later removed from the tree.

If you believe a real credential was exposed, contact security@voicegecko.dev immediately and rotate the credential.
