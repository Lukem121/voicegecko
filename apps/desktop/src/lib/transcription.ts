import { log } from '@acme/observability';
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
  log.info('[invokeTranscriptionFromBuffer] Called with audio data:', {
    samplesLength: audioData.samples.length,
    sampleRate: audioData.sample_rate,
    channels: audioData.channels,
  });

  try {
    // Fetch dictionary prompt before transcription
    const dictionaryPrompt = await dictionaryService.getDictionaryPrompt();
    log.info(
      '[invokeTranscriptionFromBuffer] Dictionary prompt:',
      dictionaryPrompt
    );

    await invoke('transcribe_audio_buffer', {
      audioData,
      dictionaryPrompt,
    });
    log.info('[invokeTranscriptionFromBuffer] Command invoked successfully');
  } catch (error) {
    log.error('Failed to invoke transcription from buffer:', error);
    toast.error('Failed to start transcription', {
      description:
        error instanceof Error ? error.message : 'Could not start process.',
    });
  }
}
