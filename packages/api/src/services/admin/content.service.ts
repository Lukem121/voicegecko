import { contentRepository } from '../../repository/admin/content.repository';

export type DictationListResult = {
  dictations: Array<{
    id: number;
    content: string;
    createdAt: Date;
    userId: string;
    userEmail: string;
    userDisplayName: string | null;
  }>;
  hasNextPage: boolean;
  nextCursor?: number;
};

export class ContentService {
  async getAllDictations(params: {
    cursor?: number;
    limit: number;
    search?: string;
  }): Promise<DictationListResult> {
    return await contentRepository.getAllDictationsPaginated(params);
  }
}

export const contentService = new ContentService();
