import { log } from '@acme/observability/log';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { dictionaryService } from '~/services/dictionary.service';
import type { AudioData } from '~/types/events';

/**
 * Invokes the dictation process on the backend using audio buffer data.
 * The dictation results will be handled by the centralized event service.
 *
 * @param audioData - The audio data including samples, sample rate, and channels.
 */
export async function invokeDictationFromBuffer(audioData: AudioData) {
  const frontendStartTime = performance.now();
  log.info('[PERF] ============== FRONTEND TRANSCRIPTION START ==============');
  log.info('[PERF] Frontend dictation invoked with audio data:', {
    samplesLength: audioData.samples.length,
    sampleRate: audioData.sample_rate,
    channels: audioData.channels,
    audioSizeMB: (audioData.samples.length * 4) / (1024 * 1024), // 4 bytes per f32
  });

  try {
    // Fetch dictionary prompt before dictation
    const dictStartTime = performance.now();
    const dictionaryPrompt = await dictionaryService.getDictionaryPrompt();
    const dictDuration = performance.now() - dictStartTime;
    log.info(`[PERF] Dictionary prompt fetch took: ${dictDuration}ms`);

    const invokeStartTime = performance.now();
    await invoke('transcribe_audio_buffer', {
      audioData,
      dictionaryPrompt,
    });
    const invokeDuration = performance.now() - invokeStartTime;
    const totalFrontendTime = performance.now() - frontendStartTime;

    log.info(`[PERF] Tauri command invocation took: ${invokeDuration}ms`);
    log.info(
      `[PERF] Total frontend dictation setup took: ${totalFrontendTime}ms`
    );
  } catch (error) {
    log.error(error, 'Failed to invoke dictation from buffer:');
    toast.error('Failed to start dictation', {
      description:
        error instanceof Error ? error.message : 'Could not start process.',
    });
  }
}
