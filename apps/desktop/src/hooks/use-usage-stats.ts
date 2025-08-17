import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { analytics } from '~/lib/analytics/posthog-analytics';
import { trpc } from '~/trpc';

// Regex pattern for removing trailing .0 from formatted numbers
const TRAILING_ZERO_REGEX = /\.0$/;

// Format numbers to compact notation (12k, 1.2M, etc.)
const formatCompactNumber = (num: number): string => {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(TRAILING_ZERO_REGEX, '')}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1).replace(TRAILING_ZERO_REGEX, '')}k`;
  }
  return num.toString();
};

// Format time intelligently (minutes for < 60min, hours for 60min+)
const formatTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)}min`;
  }
  const hours = minutes / 60;
  return `${hours.toFixed(1).replace(TRAILING_ZERO_REGEX, '')}h`;
};

type UsageStatsData = {
  wordsProcessed: number;
  timeSaved: number;
  wordsPerMinute: number;
};

type FormattedUsageStats = {
  wordsProcessed: string;
  timeSaved: string;
  wordsPerMinute: string;
  isLoading: boolean;
};

export function useUsageStats(): FormattedUsageStats {
  const options = trpc.usage.getStats.queryOptions();
  const query = useQuery(options);

  // Track usage stats viewing
  React.useEffect(() => {
    if (query.data && !query.isLoading) {
      analytics.trackFeatureFirstUse('usage_stats_view');

      // Track stats pattern
      analytics.track('usage_stats_viewed', {
        total_words: query.data.total.words,
        total_time_saved: query.data.total.timeSaved,
        current_plan: query.data.current.isUnlimited ? 'unlimited' : 'limited',
      });
    }
  }, [query.data, query.isLoading]);

  // Map backend response to frontend interface
  const rawStats: UsageStatsData = query.data
    ? {
        wordsProcessed: query.data.total.words,
        timeSaved: query.data.total.timeSaved,
        wordsPerMinute: query.data.wordsPerMinute, // Use actual calculated WPM from user's speaking data
      }
    : {
        // Fallback values while loading
        wordsProcessed: 0,
        timeSaved: 0,
        wordsPerMinute: 0, // Show 0 when no data available
      };

  return {
    wordsProcessed: formatCompactNumber(rawStats.wordsProcessed),
    timeSaved: formatTime(rawStats.timeSaved),
    wordsPerMinute:
      rawStats.wordsPerMinute > 0 ? rawStats.wordsPerMinute.toString() : '—',
    isLoading: query.isPending,
  };
}
