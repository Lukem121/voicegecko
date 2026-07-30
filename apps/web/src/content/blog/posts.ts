import type { ComponentType } from 'react';
import { WhisperContextualBiasingArticle } from './whisper-contextual-biasing-creator-names';

export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  readingTimeMinutes: number;
  author: string;
  tags: string[];
};

export type BlogPost = BlogPostMeta & {
  Content: ComponentType;
};

export const blogPosts: BlogPost[] = [
  {
    slug: 'whisper-contextual-biasing-creator-names',
    title:
      'Why Whisper Misspells Creator Names — and How Contextual Biasing Fixes Social Dictation',
    description:
      'Aggregate speech-to-text accuracy hides named-entity failures. Learn how Whisper initial prompts and live social context improve handles, brand names, and product terms in creator dictation.',
    publishedAt: '2026-07-29',
    readingTimeMinutes: 11,
    author: 'Voice Gecko Team',
    tags: [
      'Whisper',
      'speech recognition',
      'contextual biasing',
      'creator workflows',
    ],
    Content: WhisperContextualBiasingArticle,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function getAllPostSlugs(): string[] {
  return blogPosts.map((post) => post.slug);
}

export function formatPublishedDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${isoDate}T12:00:00Z`));
}
