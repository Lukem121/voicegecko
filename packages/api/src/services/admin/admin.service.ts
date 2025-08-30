// Main admin service that orchestrates all admin functionality
// This acts as a facade for the various admin services

import { analyticsService } from './analytics.service';
import { billingService } from './billing.service';
import { contentService } from './content.service';
import { userManagementService } from './user-management.service';

export type { DailyStats } from '../../repository/admin/analytics.repository';
export type {
  UserDetail,
  UserListParams,
  UserWithActivity,
} from '../../repository/admin/user-management.repository';
export type { SubscriptionWithInvoice } from './billing.service';
export type { DictationListResult } from './content.service';
// Re-export types for convenience
export type { UserListResult } from './user-management.service';

export class AdminService {
  // User Management
  async getUsersList(
    params: Parameters<typeof userManagementService.getUsersList>[0]
  ) {
    return await userManagementService.getUsersList(params);
  }

  async getUserById(userId: string) {
    return await userManagementService.getUserById(userId);
  }

  async updateUserProfile(
    userId: string,
    data: Parameters<typeof userManagementService.updateUserProfile>[1]
  ) {
    return await userManagementService.updateUserProfile(userId, data);
  }

  async getUserDictations(
    userId: string,
    params: Parameters<typeof userManagementService.getUserDictations>[1]
  ) {
    return await userManagementService.getUserDictations(userId, params);
  }

  async deleteDictation(dictationId: number, userId: string) {
    return await userManagementService.deleteDictation(dictationId, userId);
  }

  async getUserDictionary(userId: string) {
    return await userManagementService.getUserDictionary(userId);
  }

  async addDictionaryEntry(userId: string, word: string) {
    return await userManagementService.addDictionaryEntry(userId, word);
  }

  async deleteDictionaryEntry(entryId: number, userId: string) {
    return await userManagementService.deleteDictionaryEntry(entryId, userId);
  }

  // Billing
  async getUserSubscription(userId: string) {
    return await billingService.getUserSubscription(userId);
  }

  async restoreSubscription(userId: string) {
    return await billingService.restoreSubscription(userId);
  }

  // Analytics
  async getDailyStats(days?: number) {
    return await analyticsService.getDailyStats(days);
  }

  // Content
  async getAllDictations(
    params: Parameters<typeof contentService.getAllDictations>[0]
  ) {
    return await contentService.getAllDictations(params);
  }
}

export const adminService = new AdminService();
