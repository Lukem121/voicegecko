import { log } from '@acme/observability/log';
import { TRPCError } from '@trpc/server';
import OpenAI from 'openai';

export class CloudDictationService {
  private readonly openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey,
    });
  }

  async transcribeAudio(
    audioBuffer: Buffer,
    filename: string,
    prompt?: string
  ): Promise<string> {
    try {
      // Create a File object from the buffer
      const file = new File([audioBuffer], filename, { type: 'audio/wav' });

      const response = await this.openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: 'en',
        response_format: 'text',
        ...(prompt && { prompt }),
      });

      return response;
    } catch (error) {
      log.error(error, 'OpenAI dictation error:');
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to transcribe audio',
        cause: error,
      });
    }
  }
}
