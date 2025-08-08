'use client';

export default function TestimonialStrip() {
  return (
    <div className="mx-auto max-w-5xl">
      <h3 className="text-center font-semibold text-white/90">
        What people say
      </h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <blockquote className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/90">
          <p className="text-sm">
            “Voice Gecko cut my drafting time in half. It just gets out of the
            way.”
          </p>
          <footer className="mt-2 text-white/60 text-xs">
            — Alex, Product Manager
          </footer>
        </blockquote>
        <blockquote className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/90">
          <p className="text-sm">
            “The speed is wild. Notes to clipboard in seconds. It keeps me in
            flow.”
          </p>
          <footer className="mt-2 text-white/60 text-xs">
            — Priya, Engineer
          </footer>
        </blockquote>
      </div>
    </div>
  );
}
