export default function TermsPage() {
  return (
    <main className="prose prose-neutral dark:prose-invert mx-auto max-w-4xl px-6 py-16">
      <h1>Terms of Service</h1>
      <p>
        Welcome to Voice Gecko. By using our services, you agree to these terms.
      </p>
      <h2>Use of service</h2>
      <ul>
        <li>Don’t misuse the service or attempt to disrupt it.</li>
        <li>You’re responsible for your account and safeguarding access.</li>
      </ul>
      <h2>Subscriptions</h2>
      <p>
        Paid plans are billed on a recurring basis until canceled. You can
        cancel anytime from your account. Refunds are available within 30 days
        of purchase.
      </p>
      <h2>Liability</h2>
      <p>
        The service is provided “as is” without warranties. To the maximum
        extent permitted by law, our liability is limited to fees paid in the
        preceding 12 months.
      </p>
      <p>Last updated: {new Date().toISOString().slice(0, 10)}</p>
    </main>
  );
}
