import { log } from '@acme/observability';
import { NextResponse } from 'next/server';

import { getDownloadsData } from '~/lib/downloads';

/**
 * GET /api/downloads/latest
 *
 * Returns the latest release information formatted for the downloads page
 */
export async function GET() {
  try {
    const downloadsData = await getDownloadsData();

    return NextResponse.json({
      success: true,
      data: downloadsData,
    });
  } catch (error) {
    log.error('Error fetching downloads data:', error);

    if (error instanceof Error && error.message.includes('rate limit')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'GITHUB_API_ERROR',
            message: 'GitHub API rate limit exceeded. Please try again later.',
            details: { retryAfter: 3600 },
          },
        },
        { status: 429 }
      );
    }

    if (error instanceof Error && error.message.includes('GITHUB_TOKEN')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFIG_ERROR',
            message: 'Missing required environment variable: GITHUB_TOKEN',
          },
        },
        { status: 500 }
      );
    }

    if (error instanceof Error && error.message.includes('No releases found')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_RELEASE_FOUND',
            message: 'No releases found in the releases repository',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'GITHUB_API_ERROR',
          message:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
      },
      { status: 500 }
    );
  }
}
