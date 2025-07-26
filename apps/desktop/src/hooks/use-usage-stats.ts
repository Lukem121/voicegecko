import { useQuery } from "@tanstack/react-query";

import { trpc } from "~/trpc";

// Format numbers to compact notation (12k, 1.2M, etc.)
const formatCompactNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return num.toString();
};

// Format time intelligently (minutes for < 60min, hours for 60min+)
const formatTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)}min`;
  }
  const hours = minutes / 60;
  return `${hours.toFixed(1).replace(/\.0$/, "")}h`;
};

interface UsageStatsData {
  wordsProcessed: number;
  timeSaved: number;
  wordsPerMinute: number;
}

interface FormattedUsageStats {
  wordsProcessed: string;
  timeSaved: string;
  wordsPerMinute: string;
  isLoading: boolean;
}

export function useUsageStats(): FormattedUsageStats {
  const options = trpc.usage.getStats.queryOptions();
  const query = useQuery(options);

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
      rawStats.wordsPerMinute > 0 ? rawStats.wordsPerMinute.toString() : "—",
    isLoading: query.isPending,
  };
}
