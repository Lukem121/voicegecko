import { log } from '@acme/observability/log';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { dictionaryService } from '~/services/dictionary.service';
import type { AudioData } from '~/types/events';

/**
 * Invokes the transcription process on the backend using audio buffer data.
 * The transcription results will be handled by the centralized event service.
 *
 * @param audioData - The audio data including samples, sample rate, and channels.
 */
export async function invokeTranscriptionFromBuffer(audioData: AudioData) {
  const frontendStartTime = performance.now();
  log.info('[PERF] ============== FRONTEND TRANSCRIPTION START ==============');
  log.info('[PERF] Frontend transcription invoked with audio data:', {
    samplesLength: audioData.samples.length,
    sampleRate: audioData.sample_rate,
    channels: audioData.channels,
    audioSizeMB: (audioData.samples.length * 4) / (1024 * 1024), // 4 bytes per f32
  });

  try {
    // Fetch dictionary prompt before transcription
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
      `[PERF] Total frontend transcription setup took: ${totalFrontendTime}ms`
    );
  } catch (error) {
    log.error('Failed to invoke transcription from buffer:', error);
    toast.error('Failed to start transcription', {
      description:
        error instanceof Error ? error.message : 'Could not start process.',
    });
  }
}
