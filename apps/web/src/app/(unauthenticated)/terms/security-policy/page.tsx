import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Security Policy | Voice Gecko',
  description:
    'Voice Gecko Security Policy: how we protect confidentiality, integrity, and availability of our services and data.',
};

export default function SecurityPolicyPage() {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="lg:flex lg:gap-8">
        <aside className="sticky top-24 hidden h-fit w-64 shrink-0 lg:block">
          <nav aria-label="Table of contents">
            <h2 className="sr-only">On this page</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#overview">0) Overview</a>
              </li>
              <li>
                <a href="#governance-roles">1) Governance &amp; Roles</a>
              </li>
              <li>
                <a href="#risk-management">2) Risk Management</a>
              </li>
              <li>
                <a href="#people-devices-acceptable-use">
                  3) People, Devices &amp; Acceptable Use
                </a>
              </li>
              <li>
                <a href="#identity-and-access-management">
                  4) Identity &amp; Access Management (IAM)
                </a>
              </li>
              <li>
                <a href="#secure-development-change-management">
                  5) Secure Development &amp; Change Management
                </a>
              </li>
              <li>
                <a href="#cloud-and-network-security">
                  6) Cloud &amp; Network Security
                </a>
              </li>
              <li>
                <a href="#data-protection-and-privacy">
                  7) Data Protection &amp; Privacy
                </a>
              </li>
              <li>
                <a href="#third-party-providers-and-subprocessors">
                  8) Third-Party Providers &amp; Subprocessors
                </a>
              </li>
              <li>
                <a href="#vulnerability-management">
                  9) Vulnerability Management
                </a>
              </li>
              <li>
                <a href="#incident-detection-and-response">
                  10) Incident Detection &amp; Response
                </a>
              </li>
              <li>
                <a href="#business-continuity-and-disaster-recovery">
                  11) Business Continuity &amp; Disaster Recovery
                </a>
              </li>
              <li>
                <a href="#customer-responsibilities">
                  12) Customer Responsibilities
                </a>
              </li>
              <li>
                <a href="#exceptions">13) Exceptions</a>
              </li>
              <li>
                <a href="#contact">14) Contact</a>
              </li>
              <li>
                <a href="#changes-to-this-policy">15) Changes to This Policy</a>
              </li>
              <li>
                <a href="#disclaimers">16) Disclaimers</a>
              </li>
              <li>
                <a href="#appendix-a-data-classification">
                  Appendix A — Data Classification
                </a>
              </li>
            </ul>
          </nav>
        </aside>
        <article className="prose prose-neutral dark:prose-invert">
          <header>
            <h1>Voice Gecko Security Policy</h1>
            <p>
              <strong>Last updated:</strong>{' '}
              <time dateTime="2025-08-17">17 August 2025</time>
            </p>
            <p>
              <strong>Entity:</strong> Social Freak Limited (trading as “Voice
              Gecko”), a UK company
            </p>
          </header>

          <section className="scroll-mt-28" id="overview">
            <h2>0) Overview</h2>
            <p>
              <strong>Purpose.</strong> This policy explains how Voice Gecko
              protects the confidentiality, integrity, and availability of our
              services and the data we process.
            </p>
            <p>
              <strong>Scope.</strong> It covers our product, internal processes,
              and the third-party services we use (notably AWS and Vercel). It
              applies to all people who have access to Voice Gecko systems and
              data (employees, contractors, and managed service providers).
            </p>
            <p>
              <strong>Audience.</strong> External (customers, partners, and
              prospective customers).
            </p>
            <p>
              <strong>What we process.</strong> Voice Gecko converts
              user-provided audio into text. By design, we store text dictations
              and related metadata (for example: timestamps, language, and
              account identifiers). We do not store raw audio unless explicitly
              agreed for a support case or a customer-requested feature.
            </p>
            <p>
              <strong>GDPR.</strong> As a UK company, we comply with the UK GDPR
              and the Data Protection Act 2018. For most features, Voice Gecko
              acts as a processor of customer dictation content and as a
              controller for account administration data (billing, login,
              support).
            </p>
          </section>

          <section className="scroll-mt-28" id="governance-roles">
            <h2>1) Governance &amp; Roles</h2>
            <p>
              <strong>Security lead.</strong> Voice Gecko designates a security
              lead responsible for implementing, maintaining, and improving this
              policy, coordinating risk reviews, and handling security
              incidents.
            </p>
            <p>
              <strong>Policy reviews.</strong> We review this policy at least
              annually, and after any material changes to our risk profile,
              infrastructure, or legal requirements.
            </p>
            <p>
              <strong>Accountability.</strong> All people with access to
              production systems or customer data must follow this policy and
              complete onboarding that covers data handling, acceptable use, and
              incident reporting.
            </p>
          </section>

          <section className="scroll-mt-28" id="risk-management">
            <h2>2) Risk Management</h2>
            <p>
              We maintain a lightweight but formal risk management approach
              inspired by recognised frameworks (e.g., NIST). At least annually
              we:
            </p>
            <ul>
              <li>identify relevant threats and assets;</li>
              <li>assess control effectiveness and residual risks;</li>
              <li>prioritise remediation; and</li>
              <li>track improvements to closure.</li>
            </ul>
            <p>
              Documented exceptions are time-bound, risk-assessed, and approved
              by the security lead.
            </p>
          </section>

          <section className="scroll-mt-28" id="people-devices-acceptable-use">
            <h2>3) People, Devices &amp; Acceptable Use</h2>
            <h3>
              Device security (all devices used to access customer data or
              production):
            </h3>
            <ul>
              <li>
                Full-disk encryption enabled (e.g., BitLocker, FileVault).
              </li>
              <li>
                Automatic screen lock ≤ 15 minutes; strong OS account
                password/passphrase.
              </li>
              <li>
                Supported OS versions with automatic security updates applied
                promptly.
              </li>
              <li>Endpoint protection/antimalware enabled.</li>
              <li>Removable media must not be used to store customer data.</li>
            </ul>
            <h3>Accounts, secrets &amp; tools:</h3>
            <ul>
              <li>
                Password manager required for any non-SSO secrets; MFA required
                wherever supported (and mandatory for production access).
              </li>
              <li>
                Credentials and API keys must never be checked into source
                control or shared over insecure channels.
              </li>
              <li>
                Access to customer data is for support/operations only, on the
                principle of least privilege, and is logged.
              </li>
            </ul>
            <h3>Acceptable use (high level):</h3>
            <ul>
              <li>
                No unlawful activity, malware, scanning, or attempts to bypass
                security controls.
              </li>
              <li>
                Do not copy customer data to local storage outside approved
                workflows.
              </li>
              <li>
                Report suspected incidents or policy breaches immediately to the
                security lead.
              </li>
            </ul>
          </section>

          <section className="scroll-mt-28" id="identity-and-access-management">
            <h2>4) Identity &amp; Access Management (IAM)</h2>
            <ul>
              <li>
                <strong>Single sign-on.</strong> We use a central identity
                provider (e.g., Google Workspace) for corporate accounts and
                enforce MFA.
              </li>
              <li>
                <strong>Least privilege.</strong> Access is role-based and
                granted only as needed to perform duties.
              </li>
              <li>
                <strong>Segregation.</strong> Production access is limited to
                authorised accounts; administrative actions are logged.
              </li>
              <li>
                <strong>Lifecycle.</strong> Access requests are ticketed;
                reviews occur at least quarterly. Access is revoked promptly on
                role change or departure.
              </li>
              <li>
                <strong>Customer IAM.</strong> Customer authentication uses
                modern standards; MFA is encouraged where available.
                Rate-limiting and protections help deter brute-force attempts.
              </li>
            </ul>
          </section>

          <section
            className="scroll-mt-28"
            id="secure-development-change-management"
          >
            <h2>5) Secure Development &amp; Change Management</h2>
            <ul>
              <li>
                <strong>Source control.</strong> All code is kept in private
                repositories with protected branches and mandatory reviews for
                security-relevant changes.
              </li>
              <li>
                <strong>Dependency hygiene.</strong> Automated checks flag
                vulnerable third-party libraries; critical vulnerabilities are
                prioritised for patching.
              </li>
              <li>
                <strong>Secrets management.</strong> Application secrets are
                stored in managed secret stores (e.g., AWS Secrets Manager or
                similar), not in code or images.
              </li>
              <li>
                <strong>Testing &amp; CI/CD.</strong> Build pipelines use least
                privilege credentials; only signed/approved artefacts are
                deployed.
              </li>
              <li>
                <strong>Environment separation.</strong> Development/staging are
                logically separated from production. Production data is never
                used in dev/test unless properly anonymised.
              </li>
              <li>
                <strong>Configuration as code.</strong> Infrastructure changes
                are version-controlled and peer-reviewed.
              </li>
            </ul>
          </section>

          <section className="scroll-mt-28" id="cloud-and-network-security">
            <h2>6) Cloud &amp; Network Security</h2>
            <ul>
              <li>
                <strong>Hosting.</strong> Core services run on Amazon Web
                Services (AWS) and Vercel. We leverage their baseline physical
                and platform security controls.
              </li>
              <li>
                <strong>Segmentation.</strong> Security groups, managed
                firewalls, and environment-specific accounts/projects restrict
                east-west and north-south traffic.
              </li>
              <li>
                <strong>Encryption in transit.</strong> External connections
                enforce TLS 1.2+. HSTS and modern cipher suites are used; weak
                protocols are disabled.
              </li>
              <li>
                <strong>Encryption at rest.</strong> Data at rest is encrypted
                using AES-256 with cloud-managed keys (e.g., AWS KMS).
              </li>
              <li>
                <strong>Key management.</strong> Access to keys follows least
                privilege; usage is logged; keys are rotated in line with
                provider guidance and risk.
              </li>
              <li>
                <strong>Monitoring &amp; logging.</strong> Application, access,
                and infrastructure logs are collected centrally.
                Security-relevant events generate alerts for investigation.
              </li>
              <li>
                <strong>DDoS &amp; edge.</strong> We rely on cloud-native and
                managed edge protections to absorb or mitigate volumetric
                attacks.
              </li>
            </ul>
          </section>

          <section className="scroll-mt-28" id="data-protection-and-privacy">
            <h2>7) Data Protection &amp; Privacy</h2>
            <h3>7.1 Data Types</h3>
            <ul>
              <li>
                <strong>Customer Content (Dictations).</strong> Text derived
                from user-submitted audio and related metadata. May include
                personal data depending on what users submit.
              </li>
              <li>
                <strong>Account &amp; Billing Data.</strong> Names, emails,
                company details, payment metadata (payment processing is handled
                by a PCI-compliant provider).
              </li>
              <li>
                <strong>Operational Telemetry.</strong> Service logs and
                diagnostics used to operate and secure the platform (IPs, user
                agent, timestamps, event types).
              </li>
            </ul>
            <h3>7.2 Data Minimisation</h3>
            <ul>
              <li>
                We only store what we need to provide the service, support
                customers, ensure security, and meet legal obligations.
              </li>
              <li>We do not store raw audio by default.</li>
            </ul>
            <h3>7.3 Customer Controls</h3>
            <p>
              Customers can request export or deletion of dictations and account
              data (subject to legal retention requirements). Contact:
              privacy@voicegecko.dev.
            </p>
            <p>
              Upon verified request or account closure, we delete active copies
              within 30 days and remove from backups during normal backup expiry
              cycles (typically within 35–60 days thereafter).
            </p>
            <h3>7.4 Retention</h3>
            <ul>
              <li>
                Dictations are retained for as long as the customer account
                remains active or until the customer deletes them.
              </li>
              <li>
                Log data is retained for security and operational purposes
                (typically 90 days hot and up to 12 months archived, subject to
                change based on risk and legal needs).
              </li>
            </ul>
            <h3>7.5 Customer Access by Staff</h3>
            <p>
              Access to Customer Content is exceptional, logged, and limited to:
            </p>
            <ul>
              <li>resolving a support ticket;</li>
              <li>investigating an incident; or</li>
              <li>operating the service (e.g., migrations, recovery).</li>
            </ul>
            <p>We never use Customer Content for sales/marketing.</p>
            <p>
              <strong>AI/ML.</strong> We do not use Customer Content to train
              generalised AI models without explicit customer opt-in.
            </p>
            <h3>7.6 International Transfers</h3>
            <p>
              We aim to host in UK/EU regions where feasible. Some subprocessors
              may process data outside the UK/EU. Where transfers occur, we rely
              on appropriate safeguards (e.g., Standard Contractual Clauses)
              consistent with UK GDPR.
            </p>
          </section>

          <section
            className="scroll-mt-28"
            id="third-party-providers-and-subprocessors"
          >
            <h2>8) Third-Party Providers &amp; Subprocessors</h2>
            <ul>
              <li>
                We use reputable cloud and SaaS providers (including AWS and
                Vercel) that maintain strong security programs.
              </li>
              <li>
                We assess providers before onboarding (security posture,
                certifications, data location, DPA terms) and review them
                periodically thereafter.
              </li>
              <li>
                A current list of material subprocessors is maintained and
                available upon request. Data Processing Agreements are in place
                where required.
              </li>
            </ul>
          </section>

          <section className="scroll-mt-28" id="vulnerability-management">
            <h2>9) Vulnerability Management</h2>
            <ul>
              <li>
                <strong>Discovery.</strong> Automated dependency and image
                scanning, periodic infrastructure scanning, and targeted reviews
                of security-sensitive code.
              </li>
              <li>
                <strong>Prioritisation.</strong> We triage vulnerabilities by
                severity and likelihood; critical issues are addressed with
                urgency and may trigger out-of-band releases.
              </li>
              <li>
                <strong>Responsible disclosure.</strong> Security researchers
                are encouraged to report issues to security@voicegecko.dev. We
                will acknowledge receipt, investigate, and remediate as
                appropriate. (No active bug-bounty programme at this time.)
              </li>
            </ul>
          </section>

          <section
            className="scroll-mt-28"
            id="incident-detection-and-response"
          >
            <h2>10) Incident Detection &amp; Response</h2>
            <ul>
              <li>
                <strong>Detection.</strong> We monitor for anomalous activity
                across authentication, data access, application behaviour, and
                infrastructure events.
              </li>
              <li>
                <strong>Response process.</strong> Preparation → Identification
                → Containment → Eradication → Recovery → Post-incident review
                with corrective actions.
              </li>
              <li>
                <strong>Notifications.</strong> If a personal-data breach is
                likely to result in a risk to individuals’ rights and freedoms,
                we will notify affected customers without undue delay and meet
                our regulatory obligations (including notifying the ICO where
                applicable).
              </li>
              <li>
                <strong>Forensics &amp; logging.</strong> Relevant logs are
                preserved for investigation; access to evidence is restricted
                and auditable.
              </li>
            </ul>
          </section>

          <section
            className="scroll-mt-28"
            id="business-continuity-and-disaster-recovery"
          >
            <h2>11) Business Continuity &amp; Disaster Recovery</h2>
            <ul>
              <li>
                <strong>Backups.</strong> Encrypted backups are taken regularly
                and tested via restore exercises.
              </li>
              <li>
                <strong>Targets.</strong> We aim for a Recovery Point Objective
                (RPO) ≤ 12 hours and a Recovery Time Objective (RTO) ≤ 24 hours
                for core services, subject to the nature of the event.
              </li>
              <li>
                <strong>Resilience.</strong> We use managed, highly available
                cloud services and replicate critical data across availability
                zones/regions where appropriate.
              </li>
              <li>
                <strong>Remote-first operations.</strong> Our operating model
                supports secure remote work if a primary site or provider is
                unavailable.
              </li>
            </ul>
          </section>

          <section className="scroll-mt-28" id="customer-responsibilities">
            <h2>12) Customer Responsibilities</h2>
            <p>Security is a shared responsibility. Customers should:</p>
            <ul>
              <li>Use strong authentication and enable MFA where available.</li>
              <li>Control who has access to their workspace/API keys.</li>
              <li>
                Avoid submitting special category data unless necessary and
                lawful.
              </li>
              <li>Keep their own devices and browsers up to date.</li>
              <li>
                Promptly report suspected compromise of their credentials or API
                keys.
              </li>
            </ul>
          </section>

          <section className="scroll-mt-28" id="exceptions">
            <h2>13) Exceptions</h2>
            <p>
              Temporary deviations from this policy must be documented, include
              compensating controls where possible, be approved by the security
              lead, and have an explicit expiry date.
            </p>
          </section>

          <section className="scroll-mt-28" id="contact">
            <h2>14) Contact</h2>
            <ul>
              <li>
                <strong>Security:</strong> security@voicegecko.dev
              </li>
              <li>
                <strong>Privacy/Data Protection:</strong> privacy@voicegecko.dev
              </li>
              <li>
                <strong>Legal/Abuse:</strong> legal@voicegecko.dev or
                abuse@voicegecko.dev
              </li>
            </ul>
            <p>
              For access, deletion, or other data-subject requests under UK
              GDPR, contact privacy@voicegecko.dev. We will verify identity and
              respond within statutory timeframes.
            </p>
          </section>

          <section className="scroll-mt-28" id="changes-to-this-policy">
            <h2>15) Changes to This Policy</h2>
            <p>
              We may update this policy to reflect improvements, new features,
              or legal requirements. The “Last updated” date will change when we
              do. Material changes will be highlighted for a reasonable period.
            </p>
          </section>

          <section className="scroll-mt-28" id="disclaimers">
            <h2>16) Disclaimers</h2>
            <p>
              This Security Policy is provided for transparency. It is not a
              contractual commitment or a substitute for a Data Processing
              Agreement (DPA). Contractual security obligations, if any, are set
              out in the applicable agreement between Social Freak Limited
              (Voice Gecko) and the customer.
            </p>
            <p>
              Nothing in this policy limits our ability to take actions we
              reasonably believe are necessary to protect customers, the
              service, or our infrastructure.
            </p>
          </section>

          <section className="scroll-mt-28" id="appendix-a-data-classification">
            <h2>Optional Appendix A — Data Classification (concise)</h2>
            <ul>
              <li>
                <strong>Customer Content (Dictations):</strong> Highest
                protection. Encrypted at rest and in transit. Access strictly
                limited and logged.
              </li>
              <li>
                <strong>Account &amp; Billing Data:</strong> Encrypted at rest
                and in transit. Access limited to authorised personnel.
              </li>
              <li>
                <strong>Operational Telemetry/Logs:</strong> Encrypted, access
                limited; retained per Section 7.4 for security and operations.
              </li>
              <li>
                <strong>Public/Marketing Content:</strong> Intended for public
                disclosure.
              </li>
            </ul>
          </section>
        </article>
      </div>
    </main>
  );
}
