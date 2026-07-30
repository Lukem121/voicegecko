import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  formatPublishedDate,
  getAllPostSlugs,
  getPostBySlug,
} from '~/content/blog/posts';
import { APP_ROUTES } from '~/utils/app-routes';

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Post not found — Voice Gecko',
    };
  }

  return {
    title: `${post.title} — Voice Gecko`,
    description: post.description,
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const { Content } = post;

  return (
    <main className="bg-background">
      <article className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <nav aria-label="Breadcrumb" className="mb-8 text-muted-foreground text-sm">
          <Link
            className="hover:text-foreground"
            href={APP_ROUTES.MARKETING.BLOG}
          >
            Blog
          </Link>
          <span aria-hidden="true" className="mx-2">
            /
          </span>
          <span className="text-foreground">Article</span>
        </nav>

        <header className="border-border border-b pb-8">
          <p className="font-medium text-muted-foreground text-sm uppercase tracking-wide">
            Engineering
          </p>
          <h1 className="mt-3 font-semibold text-3xl text-foreground tracking-tight md:text-4xl lg:text-[2.75rem] lg:leading-tight">
            {post.title}
          </h1>
          <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
            {post.description}
          </p>
          <p className="mt-6 text-muted-foreground text-sm">
            {post.author} · {formatPublishedDate(post.publishedAt)} ·{' '}
            {post.readingTimeMinutes} min read
          </p>
        </header>

        <div className="mt-10 space-y-4 text-foreground/90 text-base leading-7 md:text-[1.05rem] md:leading-8">
          <Content />
        </div>

        <footer className="mt-16 border-border border-t pt-8">
          <Link
            className="font-medium text-foreground text-sm underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
            href={APP_ROUTES.MARKETING.BLOG}
          >
            ← Back to blog
          </Link>
        </footer>
      </article>
    </main>
  );
}
