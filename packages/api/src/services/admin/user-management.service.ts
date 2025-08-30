import { TRPCError } from '@trpc/server';
import type {
  UserDetail,
  UserListParams,
  UserWithActivity,
} from '../../repository/admin/user-management.repository';
import { userManagementRepository } from '../../repository/admin/user-management.repository';
import { dictationRepository } from '../../repository/dictation.repository';
import { dictionaryRepository } from '../../repository/dictionary.repository';

export type UserListResult = {
  users: UserWithActivity[];
  nextCursor?: string;
};

export class UserManagementService {
  async getUsersList(params: UserListParams): Promise<UserListResult> {
    return await userManagementRepository.getUsersWithActivity(params);
  }

  async getUserById(userId: string): Promise<UserDetail> {
    const user = await userManagementRepository.getUserById(userId);
    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }
    return user;
  }

  async updateUserProfile(
    userId: string,
    data: { name?: string; displayUsername?: string }
  ): Promise<void> {
    // Validate user exists
    const user = await userManagementRepository.getUserById(userId);
    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    await userManagementRepository.updateUserProfile(userId, data);
  }

  async getUserDictations(
    userId: string,
    params: { cursor?: number; limit: number; search?: string }
  ) {
    // Validate user exists
    const user = await userManagementRepository.getUserById(userId);
    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return await dictationRepository.findByUserIdPaginated(userId, params);
  }

  async deleteDictation(dictationId: number, userId: string): Promise<void> {
    const result = await dictationRepository.deleteById(dictationId, userId);
    if (!result) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Dictation not found or access denied',
      });
    }
  }

  async getUserDictionary(userId: string) {
    // Validate user exists
    const user = await userManagementRepository.getUserById(userId);
    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return await dictionaryRepository.getAllByUser(userId);
  }

  async addDictionaryEntry(userId: string, word: string) {
    // Validate user exists
    const user = await userManagementRepository.getUserById(userId);
    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    const result = await dictionaryRepository.create(userId, word);
    if (!result.success) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: result.error.message,
      });
    }
    return result.data;
  }

  async deleteDictionaryEntry(entryId: number, userId: string) {
    const result = await dictionaryRepository.delete(entryId, userId);
    if (!result.success) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: result.error.message,
      });
    }
    return result.data;
  }
}

export const userManagementService = new UserManagementService();
