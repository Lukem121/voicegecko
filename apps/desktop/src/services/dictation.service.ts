import { log } from '@acme/observability/log';
import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { toast } from 'sonner';

import { performanceTracker } from '~/lib/performance-tracker';
import { useSettingsStore } from '~/stores/settings.store';
import { recordingService } from './recording.service';

export class DictationService {
  private static instance: DictationService | undefined;
  private lastDictation = '';
  private lastDictationId: string | null = null;
  private lastPasteAtMs = 0;

  private constructor() {
    // Private constructor to prevent instantiation
  }

  static getInstance(): DictationService {
    DictationService.instance ??= new DictationService();
    return DictationService.instance;
  }

  /**
   * Set the last dictation text and optional ID
   */
  setLastDictation(text: string, id?: string): void {
    this.lastDictation = text;
    if (id) {
      this.lastDictationId = id;
    }
  }

  /**
   * Get the last dictation text
   */
  getLastDictation(): string {
    return this.lastDictation;
  }

  /**
   * Get the last dictation ID
   */
  getLastDictationId(): string | null {
    return this.lastDictationId;
  }

  /**
   * Paste the last dictation to clipboard
   */
  async pasteLastDictation(): Promise<void> {
    // Basic rate-limit to avoid spamming from duplicate shortcut events
    const now = Date.now();
    if (now - this.lastPasteAtMs < 500) {
      return;
    }
    this.lastPasteAtMs = now;

    if (this.lastDictation) {
      try {
        log.info('[DictationService] Paste-last invoked');
        log.info(
          `[DictationService] Transcript length=${this.lastDictation.length}`
        );
        // Debug: Check for unwanted characters in stored transcript
        log.info('[DEBUG] Paste-last transcript check:', {
          length: this.lastDictation.length,
          hasNewlines: this.lastDictation.includes('\n'),
          endsWithNewline: this.lastDictation.endsWith('\n'),
          lastChars: this.lastDictation
            .slice(-5)
            .split('')
            .map((c) => {
              if (c === '\n') {
                return '\\n';
              }
              if (c === '\r') {
                return '\\r';
              }
              if (c === ' ') {
                return '·';
              }
              return c;
            })
            .join(''),
        });

        // Clean the transcript before copying to clipboard
        const cleanedForPaste = this.lastDictation.trim();

        // Copy cleaned transcript to clipboard
        await writeText(cleanedForPaste);
        log.info('[DictationService] Clipboard write complete');

        // Attempt to paste into the currently focused input field
        try {
          // Small delay to give focus back to the target field after releasing modifiers
          await new Promise((r) => setTimeout(r, 30));

          // Check if user wants to prevent auto-newlines
          const { settings } = useSettingsStore.getState();
          if (settings.personalization.preventPasteNewlines) {
            log.info(
              '[DictationService] Using enhanced paste for manual paste'
            );
            await invoke('simulate_paste_with_options', {
              preventAutoNewline: true,
            });
          } else {
            await invoke('simulate_paste');
          }

          toast.success('Last dictation pasted.');
          log.info('[DictationService] Simulated paste success');
        } catch {
          // Fallback to copy-only if paste simulation fails
          toast.success('Last dictation copied to clipboard.');
          log.warn('[DictationService] Simulated paste failed; copy fallback');
        }
      } catch (error) {
        toast.error('Failed to copy dictation to clipboard');
        log.error('[DictationService] Failed during paste-last flow:', error);
        throw error;
      }
    } else {
      toast.info('No dictation available to paste.');
      log.warn('[DictationService] No last dictation available');
    }
  }

  /**
   * Handle completed dictation with clipboard and state management
   */
  async handleCompletedDictation(transcript: string): Promise<void> {
    log.info('[DictationService] Handling completed dictation:', transcript);

    if (transcript) {
      try {
        // Update internal state
        this.setLastDictation(transcript);

        // Debug: Log transcript before clipboard copy to check for unwanted characters
        log.info('[DEBUG] Transcript before clipboard copy:', {
          length: transcript.length,
          hasNewlines: transcript.includes('\n'),
          hasCarriageReturns: transcript.includes('\r'),
          endsWithNewline: transcript.endsWith('\n'),
          endsWithSpace: transcript.endsWith(' '),
          lastChars: transcript
            .slice(-5)
            .split('')
            .map((c) => {
              if (c === '\n') {
                return '\\n';
              }
              if (c === '\r') {
                return '\\r';
              }
              if (c === ' ') {
                return '·';
              }
              return c;
            })
            .join(''),
        });

        // Ensure transcript has no trailing newlines or extra whitespace before clipboard copy
        const cleanedTranscript = transcript.trim();

        // Copy cleaned transcript to clipboard
        await writeText(cleanedTranscript);
        performanceTracker.markPhase('clipboardCopyTime');

        // Check if auto-paste is enabled and simulate paste if so
        const { settings } = useSettingsStore.getState();
        if (settings.personalization.autoPasteOnCompletion) {
          try {
            log.info('[DictationService] Auto-pasting dictation...');

            // Use enhanced paste if user has enabled newline prevention
            if (settings.personalization.preventPasteNewlines) {
              log.info(
                '[DictationService] Using enhanced paste to prevent unwanted newlines'
              );
              await invoke('simulate_paste_with_options', {
                preventAutoNewline: true,
              });
            } else {
              await invoke('simulate_paste');
            }

            performanceTracker.markPhase('pasteCompleteTime');
            performanceTracker.completeSession();

            log.info('[DictationService] ✅ Auto-paste successful');
            toast.success('Dictation complete and pasted!');
          } catch (pasteError) {
            performanceTracker.markPhase('pasteCompleteTime');
            performanceTracker.completeSession();

            log.error('[DictationService] Failed to auto-paste:', pasteError);
            // Still show success for clipboard copy even if paste fails
            toast.success('Dictation complete and copied to clipboard!');
            toast.warning(
              'Auto-paste failed - text copied to clipboard instead'
            );
          }
        } else {
          // Complete the session at clipboard copy since no paste is expected
          performanceTracker.markPhase('pasteCompleteTime');
          performanceTracker.completeSession();

          // Show success toast for clipboard copy only
          toast.success('Dictation complete and copied to clipboard!');
        }
      } catch (error) {
        performanceTracker.completeSession();

        log.error('[DictationService] Failed to copy to clipboard:', error);
        toast.error('Failed to copy to clipboard', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } else {
      performanceTracker.completeSession();

      log.warn('[DictationService] Empty transcript received');
      toast.warning('Dictation returned an empty result.');
    }
  }

  /**
   * Play end notification sound if enabled according to user settings
   */
  async playEndSoundIfEnabled(): Promise<void> {
    try {
      const { settings } = useSettingsStore.getState();
      const notificationTiming = settings.audio.notificationTiming;

      // First check if interaction sounds are enabled
      if (!settings.personalization.interactionSounds) {
        log.info('[DictationService] Interaction sounds disabled');
        return;
      }

      // Play end sound on dictation completion for "completion_only" and "start_completion" timings
      // "start_stop" timing plays sounds when recording starts/stops, not on dictation
      if (
        notificationTiming === 'completion_only' ||
        notificationTiming === 'start_completion'
      ) {
        log.info('[DictationService] Playing end notification sound');
        await recordingService.playNotificationSound('End');
        log.info('[DictationService] ✅ End sound played successfully');
      } else {
        log.info('[DictationService] End sound disabled by settings');
      }
    } catch (error) {
      log.error('[DictationService] ❌ Failed to play end sound:', error);
      // Don't throw - notification sound failure shouldn't stop dictation completion
    }
  }

  /**
   * Open last dictation (placeholder for future functionality)
   */
  openLastDictation(): void {
    // Navigate the app to the dictations page via app-wide event.
    // The TrayProvider listens for this event and performs router navigation.
    emit('navigate', '/dictations').catch(() => {
      // As a non-fatal fallback, show a toast so the user gets feedback
      toast.success('Opened dictations');
    });
  }
}

export const dictationService = DictationService.getInstance();
