import { log } from '@acme/observability';
import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

import { getBaseUrl } from './base-url';

log.info('getBaseUrl', getBaseUrl());

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  plugins: [
    expoClient({
      scheme: 'expo',
      storagePrefix: 'expo',
      storage: SecureStore,
    }),
  ],
});
