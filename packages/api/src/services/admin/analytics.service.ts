import type { DailyStats } from '../../repository/admin/analytics.repository';
import { analyticsRepository } from '../../repository/admin/analytics.repository';

export class AnalyticsService {
  async getDailyStats(days = 14): Promise<DailyStats[]> {
    return await analyticsRepository.getDailyStats(days);
  }
}

export const analyticsService = new AnalyticsService();
