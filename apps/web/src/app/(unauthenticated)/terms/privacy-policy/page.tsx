import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Voice Gecko',
  description:
    'Voice Gecko Privacy Policy explaining what data we collect, how we use it, who we share it with, and your rights under UK GDPR.',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="lg:flex lg:gap-8">
        <aside className="sticky top-24 hidden h-fit w-64 shrink-0 lg:block">
          <nav aria-label="Table of contents">
            <h2 className="sr-only">On this page</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#scope">1) Scope of this Privacy Policy</a>
              </li>
              <li>
                <a href="#what-information-we-collect">
                  2) What information we collect
                </a>
                <ul className="mt-1 ml-3 space-y-1">
                  <li>
                    <a href="#personal-data-you-provide">
                      2.1 Personal data you provide directly
                    </a>
                  </li>
                  <li>
                    <a href="#personal-data-we-collect-automatically">
                      2.2 Personal data we collect automatically
                    </a>
                  </li>
                  <li>
                    <a href="#data-you-upload">2.3 Data you upload</a>
                  </li>
                  <li>
                    <a href="#information-from-others">
                      2.4 Information from others
                    </a>
                  </li>
                </ul>
              </li>
              <li>
                <a href="#why-we-use-your-data">
                  3) Why we use your data (our legal bases)
                </a>
              </li>
              <li>
                <a href="#how-we-use-the-information">
                  4) How we use the information
                </a>
              </li>
              <li>
                <a href="#cookies-and-tracking">5) Cookies and tracking</a>
              </li>
              <li>
                <a href="#sharing-of-information">6) Sharing of information</a>
              </li>
              <li>
                <a href="#international-data-transfers">
                  7) International data transfers
                </a>
              </li>
              <li>
                <a href="#retention">8) How long we keep your data</a>
              </li>
              <li>
                <a href="#childrens-privacy">9) Children’s privacy</a>
              </li>
              <li>
                <a href="#your-rights">10) Your rights under GDPR</a>
              </li>
              <li>
                <a href="#security-of-your-data">11) Security of your data</a>
              </li>
              <li>
                <a href="#marketing-communications">
                  12) Marketing communications
                </a>
              </li>
              <li>
                <a href="#business-changes">13) Business changes</a>
              </li>
              <li>
                <a href="#links-to-other-websites">
                  14) Links to other websites
                </a>
              </li>
              <li>
                <a href="#changes-to-this-privacy-policy">
                  15) Changes to this Privacy Policy
                </a>
              </li>
              <li>
                <a href="#contact-us">16) Contact us</a>
              </li>
            </ul>
          </nav>
        </aside>
        <article className="prose prose-neutral dark:prose-invert">
          <header>
            <h1>Voice Gecko – Privacy Policy</h1>
            <p>
              <strong>Effective date:</strong>{' '}
              <time dateTime="2025-08-17">17 August 2025</time>
            </p>
            <p>
              <strong>Who we are:</strong> Social Freak Limited, trading as
              “Voice Gecko” (“Voice Gecko”, "we", "us", "our"). Registered in
              England &amp; Wales. Company number: 14659411.
            </p>
          </header>
          <p>
            Your privacy is extremely important to us. This Privacy Policy
            explains what personal data we collect, how we use it, who we share
            it with, and the rights you have under applicable data protection
            law, including the UK General Data Protection Regulation (UK GDPR).
          </p>
          <p>
            By creating an account, using our websites, applications, or
            services (together, the “Service”), you agree to this Privacy
            Policy. If you do not agree, please do not use the Service.
          </p>

          <section className="scroll-mt-28" id="scope">
            <h2>1. Scope of this Privacy Policy</h2>
            <p>
              This Privacy Policy applies to information collected through your
              use of the Service, including our website, apps, API, and when you
              interact with us (for example, contacting support).
            </p>
            <p>It does not cover:</p>
            <ul>
              <li>
                Information we process as an employer (covered by our internal
                HR policies).
              </li>
              <li>
                Information processed under separate contracts (e.g., a Data
                Processing Addendum).
              </li>
            </ul>
            <p>
              This Privacy Policy is part of and subject to our{' '}
              <a href="/terms/terms-of-service">Terms of Service</a>.
            </p>
          </section>

          <section className="scroll-mt-28" id="contact-us">
            <h2>16. Contact us</h2>
            <p>
              If you have any questions or requests about this Privacy Policy or
              how we handle your data, contact us:
            </p>
            <ul>
              <li>
                Email:{' '}
                <a href="mailto:privacy@voicegecko.com">
                  privacy@voicegecko.com
                </a>
              </li>
              <li>
                Support:{' '}
                <a href="mailto:support@voicegecko.com">
                  support@voicegecko.com
                </a>
              </li>
              <li>
                Legal:{' '}
                <a href="mailto:legal@voicegecko.com">legal@voicegecko.com</a>
              </li>
            </ul>
          </section>

          <section className="scroll-mt-28" id="changes-to-this-privacy-policy">
            <h2>15. Changes to this Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. If we make
              significant changes, we will notify you by email (if you have an
              account) or by posting a notice on our site. The date at the top
              always shows when it was last updated.
            </p>
          </section>

          <section className="scroll-mt-28" id="links-to-other-websites">
            <h2>14. Links to other websites</h2>
            <p>
              The Service may contain links to third-party sites. We are not
              responsible for their privacy practices. Please review their
              policies.
            </p>
          </section>

          <section className="scroll-mt-28" id="business-changes">
            <h2>13. Business changes</h2>
            <p>
              If we undergo a merger, acquisition, or sale of assets, your data
              may be transferred as part of that transaction, subject to this
              Privacy Policy.
            </p>
          </section>

          <section className="scroll-mt-28" id="marketing-communications">
            <h2>12. Marketing communications</h2>
            <p>
              We may send you transactional emails (e.g., account confirmations,
              billing notices, service updates). You cannot opt out of these
              while using the Service.
            </p>
            <p>
              We may send marketing emails (e.g., newsletters, promotions) if
              you opt in or where permitted by law. You can opt out anytime by
              clicking “unsubscribe” in the email or emailing
              <a href="mailto:privacy@voicegecko.com">
                {' '}
                privacy@voicegecko.com
              </a>
              .
            </p>
          </section>

          <section className="scroll-mt-28" id="security-of-your-data">
            <h2>11. Security of your data</h2>
            <p>
              We use appropriate technical and organisational measures to
              protect your data, including encryption in transit and at rest,
              access controls, and monitoring.
            </p>
            <p>
              No system is 100% secure, but we follow industry best practices
              and review our controls regularly. See our published{' '}
              <a href="/terms/security-policy">Security Policy</a> for more
              details.
            </p>
          </section>

          <section className="scroll-mt-28" id="your-rights">
            <h2>10. Your rights under GDPR</h2>
            <p>As a UK or EU data subject, you have the following rights:</p>
            <ul>
              <li>
                <strong>Access</strong> – request a copy of your personal data.
              </li>
              <li>
                <strong>Rectification</strong> – correct inaccurate or
                incomplete data.
              </li>
              <li>
                <strong>Erasure (“right to be forgotten”)</strong> – request
                deletion of your data, subject to legal obligations.
              </li>
              <li>
                <strong>Portability</strong> – request transfer of your data to
                another provider.
              </li>
              <li>
                <strong>Restriction</strong> – request limits on processing in
                certain cases.
              </li>
              <li>
                <strong>Objection</strong> – object to processing based on
                legitimate interests, including direct marketing.
              </li>
              <li>
                <strong>Withdraw consent</strong> – where processing is based on
                consent, you can withdraw it anytime.
              </li>
            </ul>
            <p>
              You can exercise your rights by emailing{' '}
              <a href="mailto:privacy@voicegecko.com">privacy@voicegecko.com</a>
              . We may need to verify your identity before fulfilling a request.
            </p>
            <p>
              If you are unhappy with our handling of your data, you have the
              right to complain to the Information Commissioner’s Office (ICO) (
              <a href="https://www.ico.org.uk">www.ico.org.uk</a>) or your local
              regulator.
            </p>
          </section>

          <section className="scroll-mt-28" id="childrens-privacy">
            <h2>9. Children’s privacy</h2>
            <p>
              The Service is not intended for or directed to children under 16.
              We do not knowingly collect data from anyone under 16. If you
              believe a child under 16 has provided us data, please contact us
              and we will delete it.
            </p>
          </section>

          <section className="scroll-mt-28" id="retention">
            <h2>8. How long we keep your data</h2>
            <ul>
              <li>
                <strong>Account data</strong> – kept while your account is
                active. Deleted if you close your account.
              </li>
              <li>
                <strong>Dictations</strong> – kept until you delete them or
                close your account.
              </li>
              <li>
                <strong>Logs and analytics</strong> – kept for a limited time
                (typically 12–24 months) for troubleshooting and performance
                monitoring.
              </li>
              <li>
                <strong>Legal and financial records</strong> – kept as required
                by law (e.g., tax records).
              </li>
            </ul>
            <p>
              When data is no longer needed, we securely delete or anonymise it.
            </p>
          </section>

          <section className="scroll-mt-28" id="international-data-transfers">
            <h2>7. International data transfers</h2>
            <p>
              We are a UK company, but many of our service providers (such as
              AWS and Stripe) may store or process data outside the UK and EEA,
              including the United States.
            </p>
            <p>
              Where data is transferred internationally, we ensure safeguards
              are in place, such as Standard Contractual Clauses approved by the
              UK/EU. By using the Service, you acknowledge your data may be
              transferred to countries that may not have the same data
              protection laws as your home country, but always subject to these
              safeguards.
            </p>
          </section>

          <section className="scroll-mt-28" id="sharing-of-information">
            <h2>6. Sharing of information</h2>
            <p>We only share personal data where necessary:</p>
            <ul>
              <li>
                <strong>Service providers</strong> – hosting (AWS, Vercel),
                payment processing (Stripe), email delivery (e.g., SendGrid),
                analytics, error tracking. These providers act as processors
                under GDPR and only process data on our behalf.
              </li>
              <li>
                <strong>Legal requirements</strong> – if required by law, court
                order, or regulatory authority.
              </li>
              <li>
                <strong>Business transfers</strong> – if we are acquired, merge,
                or sell assets, your data may transfer as part of that
                transaction.
              </li>
              <li>
                <strong>With your consent</strong> – where you ask us to connect
                with third-party services or integrations.
              </li>
            </ul>
            <p>We do not sell personal data to advertisers.</p>
          </section>

          <section className="scroll-mt-28" id="cookies-and-tracking">
            <h2>5. Cookies and tracking</h2>
            <ul>
              <li>Enable core functions (authentication, account security).</li>
              <li>Analyse usage and performance.</li>
              <li>Deliver optional marketing (if you consent).</li>
            </ul>
            <p>
              You can control cookies in your browser settings and via our
              Cookie Policy.
            </p>
          </section>

          <section className="scroll-mt-28" id="how-we-use-the-information">
            <h2>4. How we use the information</h2>
            <ul>
              <li>
                Provide and operate the Service (including processing your audio
                into dictations).
              </li>
              <li>Process payments and subscriptions.</li>
              <li>
                Communicate with you (transactional messages, support, service
                updates, optional marketing).
              </li>
              <li>Personalise and improve the Service.</li>
              <li>Monitor, troubleshoot, and secure the Service.</li>
              <li>Comply with legal obligations.</li>
            </ul>
            <p>
              We may also use aggregated or de-identified data for analytics and
              product development.
            </p>
          </section>

          <section className="scroll-mt-28" id="why-we-use-your-data">
            <h2>3. Why we use your data (our legal bases)</h2>
            <p>
              We use your data only when we have a lawful basis under UK GDPR:
            </p>
            <ul>
              <li>
                <strong>Contract</strong> – to provide the Service you requested
                (account setup, dictations, billing, support).
              </li>
              <li>
                <strong>Legitimate interests</strong> – to secure and improve
                the Service, prevent abuse, analyse usage, and market to
                existing customers.
              </li>
              <li>
                <strong>Consent</strong> – for optional activities such as
                sending you marketing emails or placing certain cookies. You can
                withdraw consent at any time.
              </li>
              <li>
                <strong>Legal obligation</strong> – to comply with tax,
                accounting, or regulatory requirements.
              </li>
            </ul>
            <p>We do not sell your data.</p>
          </section>

          <section className="scroll-mt-28" id="what-information-we-collect">
            <h2>2. What information we collect</h2>
            <p>
              We collect both personal data (information that identifies you or
              could identify you) and non-personal data (technical or
              statistical information).
            </p>

            <h3 id="personal-data-you-provide">
              2.1 Personal data you provide directly
            </h3>
            <ul>
              <li>
                <strong>Account information</strong> – name, email address,
                password.
              </li>
              <li>
                <strong>Billing information</strong> – handled by our payment
                processor (e.g., Stripe). We do not store full payment card
                details ourselves.
              </li>
              <li>
                <strong>Support and correspondence</strong> – if you contact us
                by email or otherwise, we keep your communications.
              </li>
            </ul>

            <h3 id="personal-data-we-collect-automatically">
              2.2 Personal data we collect automatically
            </h3>
            <ul>
              <li>
                <strong>Usage data</strong> – which features you use, actions
                you take, and how you interact with the Service.
              </li>
              <li>
                <strong>Device and connection data</strong> – IP address,
                browser type, device type, operating system, referring/exit
                pages, crash logs.
              </li>
              <li>
                <strong>Cookies and tracking</strong> – we and our partners use
                cookies, pixels, and similar technologies for analytics,
                functionality, and (if you consent) marketing. See our Cookie
                Policy for details.
              </li>
              <li>
                <strong>Log files</strong> – we record non-identifying data such
                as IPs, timestamps, and error events.
              </li>
            </ul>

            <h3 id="data-you-upload">2.3 Data you upload</h3>
            <p>
              When you use the Service, you may upload audio files and generate
              dictations (“User Content”). Audio is not stored unless required
              for support or a feature you enable; dictation text is stored so
              you can access and manage it.
            </p>

            <h3 id="information-from-others">2.4 Information from others</h3>
            <ul>
              <li>
                <strong>Third-party services</strong> – if you connect external
                accounts or services (for example, through an integration), we
                may receive data from those services depending on your settings.
              </li>
              <li>
                <strong>Service providers</strong> – we may receive technical or
                analytical data from providers (e.g., error tracking,
                analytics).
              </li>
            </ul>
            <p>
              We do not knowingly collect sensitive categories of data (e.g.,
              health, political views, religion) and you should not upload such
              data to the Service.
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
