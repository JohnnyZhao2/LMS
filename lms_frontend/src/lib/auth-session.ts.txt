import type { TokenPair } from '@/types/auth';
import { tokenStorage } from './token-storage';

export const hasStoredAuthSession = (): boolean => tokenStorage.hasTokens();

export const getStoredRefreshToken = (): string | null => tokenStorage.getRefreshToken();

export const commitAuthSession = ({ access_token, refresh_token }: TokenPair): void => {
  tokenStorage.setTokens(access_token, refresh_token);
};

export const clearStoredAuthSession = (): void => {
  tokenStorage.clearAll();
};
