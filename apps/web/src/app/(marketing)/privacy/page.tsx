export default function PrivacyPage() {
  return (
    <main className="prose prose-neutral dark:prose-invert mx-auto max-w-4xl px-6 py-16">
      <h1>Privacy Policy</h1>
      <p>
        We take privacy seriously. This page describes what we collect, why we
        collect it, and the choices you have.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details you provide (like email).</li>
        <li>
          Subscription and billing information (handled by our payment
          provider).
        </li>
        <li>
          Usage data to improve performance and reliability. You can opt out of
          analytics in settings.
        </li>
      </ul>
      <h2>Transcription data</h2>
      <p>
        By default, your transcriptions are processed to deliver results and may
        be kept for a short period to ensure reliability. You control whether
        data is retained. You can delete your data at any time.
      </p>
      <h2>Your choices</h2>
      <ul>
        <li>Access, export, or delete your data from your account.</li>
        <li>Configure privacy mode to limit data retention.</li>
        <li>Contact support for any privacy-related request.</li>
      </ul>
      <p>Last updated: {new Date().toISOString().slice(0, 10)}</p>
    </main>
  );
}
