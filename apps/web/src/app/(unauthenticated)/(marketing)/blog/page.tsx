import type { Metadata } from 'next';
import Link from 'next/link';
import {
  blogPosts,
  formatPublishedDate,
} from '~/content/blog/posts';
import { APP_ROUTES } from '~/utils/app-routes';

export const metadata: Metadata = {
  title: 'Blog — Voice Gecko',
  description:
    'Engineering notes on dictation, speech recognition, and building accurate voice-to-text for real workflows.',
  openGraph: {
    title: 'Blog — Voice Gecko',
    description:
      'Engineering notes on dictation, speech recognition, and building accurate voice-to-text for real workflows.',
    type: 'website',
  },
};

export default function BlogIndexPage() {
  return (
    <main className="bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <p className="font-medium text-muted-foreground text-sm uppercase tracking-wide">
          Blog
        </p>
        <h1 className="mt-2 font-semibold text-4xl text-foreground tracking-tight md:text-5xl">
          Notes from the Voice Gecko team
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground text-lg leading-relaxed">
          Practical writing on speech recognition, dictation accuracy, and the
          product decisions behind Voice Gecko.
        </p>

        <ul className="mt-12 space-y-8">
          {blogPosts.map((post) => (
            <li key={post.slug}>
              <article className="rounded-3xl border border-border bg-card/40 p-6 transition-colors hover:border-primary/40 md:p-8">
                <p className="text-muted-foreground text-sm">
                  {formatPublishedDate(post.publishedAt)} ·{' '}
                  {post.readingTimeMinutes} min read · {post.author}
                </p>
                <h2 className="mt-2 font-semibold text-2xl text-foreground tracking-tight">
                  <Link
                    className="hover:text-primary"
                    href={`${APP_ROUTES.MARKETING.BLOG}/${post.slug}`}
                  >
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  {post.description}
                </p>
                <Link
                  className="mt-4 inline-flex font-medium text-foreground text-sm underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
                  href={`${APP_ROUTES.MARKETING.BLOG}/${post.slug}`}
                >
                  Read article
                </Link>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
