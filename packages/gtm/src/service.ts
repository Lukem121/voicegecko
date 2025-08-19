import { log } from '@acme/observability/log';
import { gtmEnv } from '../env';
import type { GTMEvent, GTMResponse } from './types';

export type GTMConfig = {
  GTM_GCP_PROJECT_ID: string;
  GTM_CONTAINER_ENDPOINT: string;
  NODE_ENV?: string;
};

export class GTMService {
  private readonly config: GTMConfig;

  constructor(config?: GTMConfig) {
    this.config = config || gtmEnv();
  }

  /**
   * Sends an event to Google Tag Manager server-side container
   */
  async sendEvent(event: GTMEvent): Promise<GTMResponse> {
    try {
      // Only send events in production unless explicitly testing
      if (this.config.NODE_ENV === 'development') {
        log.info('[GTM] Development mode - would send event:', event);
        return { success: true };
      }

      const response = await fetch(this.config.GTM_CONTAINER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'VoiceGecko-GTM-Service/1.0',
        },
        body: JSON.stringify({
          // Include the container configuration in the request
          client_id: this.generateClientId(),
          events: [event],
          gtm: {
            container_id: this.getContainerId(),
            project_id: this.config.GTM_GCP_PROJECT_ID,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(
          `GTM request failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      return { success: true, ...result };
    } catch (error) {
      log.error('[GTM] Failed to send event:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sends multiple events in a batch to GTM
   */
  async sendEvents(events: GTMEvent[]): Promise<GTMResponse> {
    try {
      if (this.config.NODE_ENV === 'development') {
        log.info('[GTM] Development mode - would send events:', events);
        return { success: true };
      }

      const response = await fetch(this.config.GTM_CONTAINER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'VoiceGecko-GTM-Service/1.0',
        },
        body: JSON.stringify({
          client_id: this.generateClientId(),
          events,
          gtm: {
            container_id: this.getContainerId(),
            project_id: this.config.GTM_GCP_PROJECT_ID,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(
          `GTM batch request failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      return { success: true, ...result };
    } catch (error) {
      log.error('[GTM] Failed to send events:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get the server-side container ID
   * Using hardcoded server-side container ID since it's stable across environments
   */
  private getContainerId(): string {
    return 'GTM-NTB6SCF4'; // Server-side container ID
  }

  /**
   * Generate a unique client ID for tracking
   */
  private generateClientId(): string {
    return `${Date.now()}.${Math.random().toString(36).substring(2, 15)}`;
  }
}

/**
 * Creates a GTM service instance with the provided configuration
 */
export function createGTMService(config?: GTMConfig): GTMService {
  return new GTMService(config);
}

// Export singleton instance
export const gtmService = new GTMService();
