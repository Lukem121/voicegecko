import { log } from '@acme/observability/log';
import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { toast } from 'sonner';

import { performanceTracker } from '~/lib/performance-tracker';
import { useSettingsStore } from '~/stores/settings.store';
import { recordingService } from './recording.service';

export class TranscriptionService {
  private static instance: TranscriptionService | undefined;
  private lastTranscription = '';
  private lastTranscriptionId: string | null = null;
  private lastPasteAtMs = 0;

  private constructor() {
    // Private constructor to prevent instantiation
  }

  static getInstance(): TranscriptionService {
    TranscriptionService.instance ??= new TranscriptionService();
    return TranscriptionService.instance;
  }

  /**
   * Set the last transcription text and optional ID
   */
  setLastTranscription(text: string, id?: string): void {
    this.lastTranscription = text;
    if (id) {
      this.lastTranscriptionId = id;
    }
  }

  /**
   * Get the last transcription text
   */
  getLastTranscription(): string {
    return this.lastTranscription;
  }

  /**
   * Get the last transcription ID
   */
  getLastTranscriptionId(): string | null {
    return this.lastTranscriptionId;
  }

  /**
   * Paste the last transcription to clipboard
   */
  async pasteLastTranscription(): Promise<void> {
    // Basic rate-limit to avoid spamming from duplicate shortcut events
    const now = Date.now();
    if (now - this.lastPasteAtMs < 500) {
      return;
    }
    this.lastPasteAtMs = now;

    if (this.lastTranscription) {
      try {
        log.info('[TranscriptionService] Paste-last invoked');
        log.info(
          `[TranscriptionService] Transcript length=${this.lastTranscription.length}`
        );
        // Debug: Check for unwanted characters in stored transcript
        log.info('[DEBUG] Paste-last transcript check:', {
          length: this.lastTranscription.length,
          hasNewlines: this.lastTranscription.includes('\n'),
          endsWithNewline: this.lastTranscription.endsWith('\n'),
          lastChars: this.lastTranscription
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
        const cleanedForPaste = this.lastTranscription.trim();

        // Copy cleaned transcript to clipboard
        await writeText(cleanedForPaste);
        log.info('[TranscriptionService] Clipboard write complete');

        // Attempt to paste into the currently focused input field
        try {
          // Small delay to give focus back to the target field after releasing modifiers
          await new Promise((r) => setTimeout(r, 30));

          // Check if user wants to prevent auto-newlines
          const { settings } = useSettingsStore.getState();
          if (settings.personalization.preventPasteNewlines) {
            log.info(
              '[TranscriptionService] Using enhanced paste for manual paste'
            );
            await invoke('simulate_paste_with_options', {
              preventAutoNewline: true,
            });
          } else {
            await invoke('simulate_paste');
          }

          toast.success('Last transcription pasted.');
          log.info('[TranscriptionService] Simulated paste success');
        } catch {
          // Fallback to copy-only if paste simulation fails
          toast.success('Last transcription copied to clipboard.');
          log.warn(
            '[TranscriptionService] Simulated paste failed; copy fallback'
          );
        }
      } catch (error) {
        toast.error('Failed to copy transcription to clipboard');
        log.error(
          '[TranscriptionService] Failed during paste-last flow:',
          error
        );
        throw error;
      }
    } else {
      toast.info('No transcription available to paste.');
      log.warn('[TranscriptionService] No last transcription available');
    }
  }

  /**
   * Handle completed transcription with clipboard and state management
   */
  async handleCompletedTranscription(transcript: string): Promise<void> {
    log.info(
      '[TranscriptionService] Handling completed transcription:',
      transcript
    );

    if (transcript) {
      try {
        // Update internal state
        this.setLastTranscription(transcript);

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
            log.info('[TranscriptionService] Auto-pasting transcription...');

            // Use enhanced paste if user has enabled newline prevention
            if (settings.personalization.preventPasteNewlines) {
              log.info(
                '[TranscriptionService] Using enhanced paste to prevent unwanted newlines'
              );
              await invoke('simulate_paste_with_options', {
                preventAutoNewline: true,
              });
            } else {
              await invoke('simulate_paste');
            }

            performanceTracker.markPhase('pasteCompleteTime');
            performanceTracker.completeSession();

            log.info('[TranscriptionService] ✅ Auto-paste successful');
            toast.success('Transcription complete and pasted!');
          } catch (pasteError) {
            performanceTracker.markPhase('pasteCompleteTime');
            performanceTracker.completeSession();

            log.error(
              '[TranscriptionService] Failed to auto-paste:',
              pasteError
            );
            // Still show success for clipboard copy even if paste fails
            toast.success('Transcription complete and copied to clipboard!');
            toast.warning(
              'Auto-paste failed - text copied to clipboard instead'
            );
          }
        } else {
          // Complete the session at clipboard copy since no paste is expected
          performanceTracker.markPhase('pasteCompleteTime');
          performanceTracker.completeSession();

          // Show success toast for clipboard copy only
          toast.success('Transcription complete and copied to clipboard!');
        }
      } catch (error) {
        performanceTracker.completeSession();

        log.error('[TranscriptionService] Failed to copy to clipboard:', error);
        toast.error('Failed to copy to clipboard', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } else {
      performanceTracker.completeSession();

      log.warn('[TranscriptionService] Empty transcript received');
      toast.warning('Transcription returned an empty result.');
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
        log.info('[TranscriptionService] Interaction sounds disabled');
        return;
      }

      // Play end sound on transcription completion for "completion_only" and "start_completion" timings
      // "start_stop" timing plays sounds when recording starts/stops, not on transcription
      if (
        notificationTiming === 'completion_only' ||
        notificationTiming === 'start_completion'
      ) {
        log.info('[TranscriptionService] Playing end notification sound');
        await recordingService.playNotificationSound('End');
        log.info('[TranscriptionService] ✅ End sound played successfully');
      } else {
        log.info('[TranscriptionService] End sound disabled by settings');
      }
    } catch (error) {
      log.error('[TranscriptionService] ❌ Failed to play end sound:', error);
      // Don't throw - notification sound failure shouldn't stop transcription completion
    }
  }

  /**
   * Open last transcription (placeholder for future functionality)
   */
  openLastTranscription(): void {
    // Navigate the app to the transcriptions page via app-wide event.
    // The TrayProvider listens for this event and performs router navigation.
    emit('navigate', '/transcriptions').catch(() => {
      // As a non-fatal fallback, show a toast so the user gets feedback
      toast.success('Opened transcriptions');
    });
  }
}

export const transcriptionService = TranscriptionService.getInstance();
