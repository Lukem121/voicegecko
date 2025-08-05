import { authRepository } from '../../repository/auth.repository';

export class AuthService {
  async getBanStatus(email: string) {
    const result = await authRepository.getBanByEmail(email);

    if (!result) {
      return null;
    }

    return {
      isBanned: result.banned,
      reason: result.banReason,
      expiresAt: result.banExpires,
    };
  }
}
