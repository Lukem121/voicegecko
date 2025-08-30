import { log } from '@acme/observability/log';
import { revalidatePath, revalidateTag } from 'next/cache';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { env } from '~/env';

// Request validation schema
const revalidateRequestSchema = z
  .object({
    secret: z.string().min(1, 'Secret is required'),
    paths: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  })
  .refine((data) => data.paths || data.tags, {
    message: 'Either paths or tags must be provided',
  });

// Helper function to get client IP
function getClientIP(request: NextRequest): string | null {
  return (
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    null
  );
}

// Helper function to perform revalidations
function performRevalidations(
  paths?: string[],
  tags?: string[]
): { revalidatedPaths: string[]; revalidatedTags: string[] } {
  const revalidatedPaths: string[] = [];
  const revalidatedTags: string[] = [];

  // Revalidate paths
  if (paths && paths.length > 0) {
    for (const path of paths) {
      try {
        revalidatePath(path);
        revalidatedPaths.push(path);
        log.info(`Revalidated path: ${path}`);
      } catch (error) {
        log.error(`Failed to revalidate path ${path}:`, error);
      }
    }
  }

  // Revalidate tags
  if (tags && tags.length > 0) {
    for (const tag of tags) {
      try {
        revalidateTag(tag);
        revalidatedTags.push(tag);
        log.info(`Revalidated tag: ${tag}`);
      } catch (error) {
        log.error(`Failed to revalidate tag ${tag}:`, error);
      }
    }
  }

  return { revalidatedPaths, revalidatedTags };
}

/**
 * Enhanced revalidation endpoint that supports:
 * - Path-based revalidation
 * - Tag-based revalidation
 * - Security via secret authentication
 * - Multiple paths/tags in a single request
 *
 * Usage:
 * POST /api/revalidate
 * Body: {
 *   "secret": "your-secret",
 *   "paths": ["/", "/pricing"],  // Optional: specific paths to revalidate
 *   "tags": ["downloads", "pricing"]  // Optional: cache tags to revalidate
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = revalidateRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return Response.json(
        {
          revalidated: false,
          now: Date.now(),
          error: 'Invalid request format',
          details: validationResult.error,
        },
        { status: 400 }
      );
    }

    const { secret, paths, tags } = validationResult.data;

    // Verify secret
    if (secret !== env.REVALIDATE_SECRET) {
      log.warn('Unauthorized revalidation attempt', {
        userAgent: request.headers.get('user-agent'),
        ip: getClientIP(request),
      });

      return Response.json(
        {
          revalidated: false,
          now: Date.now(),
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Perform revalidations
    const { revalidatedPaths, revalidatedTags } = performRevalidations(
      paths,
      tags
    );

    return Response.json({
      revalidated: true,
      now: Date.now(),
      revalidatedPaths,
      revalidatedTags,
      message: `Successfully revalidated ${revalidatedPaths.length} paths and ${revalidatedTags.length} tags`,
    });
  } catch (error) {
    log.error(error, 'Error in revalidation endpoint:');

    return Response.json(
      {
        revalidated: false,
        now: Date.now(),
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Legacy GET endpoint for backward compatibility
 * Usage: GET /api/revalidate?secret=your-secret&path=/
 */
export function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const path = request.nextUrl.searchParams.get('path');

  if (!secret) {
    return Response.json(
      {
        revalidated: false,
        now: Date.now(),
        error: 'Missing secret parameter',
      },
      { status: 400 }
    );
  }

  if (!path) {
    return Response.json(
      {
        revalidated: false,
        now: Date.now(),
        error: 'Missing path parameter',
      },
      { status: 400 }
    );
  }

  if (secret !== env.REVALIDATE_SECRET) {
    log.warn('Unauthorized revalidation attempt via GET', {
      userAgent: request.headers.get('user-agent'),
      ip: getClientIP(request),
    });

    return Response.json(
      {
        revalidated: false,
        now: Date.now(),
        error: 'Unauthorized',
      },
      { status: 401 }
    );
  }

  try {
    revalidatePath(path);
    log.info(`Revalidated path via GET: ${path}`);

    return Response.json({
      revalidated: true,
      now: Date.now(),
      revalidatedPaths: [path],
      message: `Successfully revalidated path: ${path}`,
    });
  } catch (error) {
    log.error(`Failed to revalidate path ${path}:`, error);

    return Response.json(
      {
        revalidated: false,
        now: Date.now(),
        error: 'Failed to revalidate path',
      },
      { status: 500 }
    );
  }
}
