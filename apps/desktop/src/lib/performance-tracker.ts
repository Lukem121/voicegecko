import { log } from '@acme/observability/log';

type PerformanceSession = {
  sessionId: string;
  startTime: number;
  phases: {
    recordingStopTime?: number;
    audioProcessingTime?: number;
    dictationStartTime?: number;
    dictationCompleteTime?: number;
    clipboardCopyTime?: number;
    pasteCompleteTime?: number;
  };
  audioMetadata?: {
    samplesLength: number;
    durationSeconds: number;
    sampleRate: number;
  };
};

class EndToEndPerformanceTracker {
  private currentSession: PerformanceSession | null = null;

  startSession(audioMetadata?: PerformanceSession['audioMetadata']): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.currentSession = {
      sessionId,
      startTime: performance.now(),
      phases: {},
      audioMetadata,
    };

    log.info(`[PERF] 🚀 Started end-to-end performance session: ${sessionId}`);
    if (audioMetadata) {
      log.info('[PERF] Audio metadata:', audioMetadata);
    }

    return sessionId;
  }

  markPhase(phase: keyof PerformanceSession['phases']) {
    if (!this.currentSession) {
      log.warn(`[PERF] Cannot mark phase ${phase} - no active session`);
      return;
    }

    const currentTime = performance.now();
    const elapsed = currentTime - this.currentSession.startTime;

    // Validate timing - don't allow negative times
    if (elapsed < 0) {
      log.warn(
        `[PERF] Invalid timing for ${phase}: ${elapsed.toFixed(2)}ms (negative) - skipping`
      );
      return;
    }

    this.currentSession.phases[phase] = currentTime;
    log.info(`[PERF] 📍 ${phase}: ${elapsed.toFixed(2)}ms`);
  }

  completeSession(finalPhase?: keyof PerformanceSession['phases']) {
    if (!this.currentSession) {
      log.warn('[PERF] Cannot complete session - no active session');
      return;
    }

    if (finalPhase) {
      this.markPhase(finalPhase);
    }

    const totalTime = performance.now() - this.currentSession.startTime;
    const phases = this.currentSession.phases;
    const audio = this.currentSession.audioMetadata;

    log.info(
      '[PERF] 🏁 =============== END-TO-END PERFORMANCE COMPLETE ==============='
    );
    log.info(`[PERF] Session: ${this.currentSession.sessionId}`);
    log.info(`[PERF] 🔥 TOTAL END-TO-END TIME: ${totalTime.toFixed(2)}ms`);

    if (audio) {
      const realTimeFactor = audio.durationSeconds / (totalTime / 1000);
      log.info(
        `[PERF] Audio duration: ${audio.durationSeconds.toFixed(2)}s | Real-time factor: ${realTimeFactor.toFixed(2)}x`
      );
    }

    // Calculate phase durations - sort by actual timestamps to handle out-of-order events
    const phaseEntries = Object.entries(phases)
      .filter(([_, time]) => time !== undefined)
      .map(([name, time]) => ({
        name: name as keyof PerformanceSession['phases'],
        time,
      }))
      .sort((a, b) => a.time - b.time);

    log.info('[PERF] 📊 Phase Breakdown:');
    let lastTime = this.currentSession.startTime;

    for (const { name: phaseName, time: phaseTime } of phaseEntries) {
      const duration = Math.max(0, phaseTime - lastTime); // Ensure non-negative durations
      const totalElapsed = phaseTime - this.currentSession.startTime;
      log.info(
        `[PERF]   ${phaseName}: +${duration.toFixed(2)}ms (total: ${totalElapsed.toFixed(2)}ms)`
      );
      lastTime = phaseTime;
    }

    // Calculate major section durations using sorted timing data
    const audioProcessingStart = this.currentSession.startTime;
    const audioProcessingEnd = phases.audioProcessingTime;
    if (audioProcessingEnd) {
      const audioProcessingDuration = audioProcessingEnd - audioProcessingStart;
      log.info(
        `[PERF] 🎵 Audio Processing Total: ${audioProcessingDuration.toFixed(2)}ms`
      );
    }

    if (phases.dictationCompleteTime && phases.dictationStartTime) {
      const dictationDuration =
        phases.dictationCompleteTime - phases.dictationStartTime;
      log.info(
        `[PERF] Transcription inference total: ${dictationDuration.toFixed(2)}ms`
      );
    }

    if (phases.pasteCompleteTime && phases.clipboardCopyTime) {
      const clipboardDuration =
        phases.pasteCompleteTime - phases.clipboardCopyTime;
      log.info(
        `[PERF] 📋 Clipboard & Paste Total: ${clipboardDuration.toFixed(2)}ms`
      );
    }

    log.info(
      '[PERF] ================================================================'
    );

    this.currentSession = null;
  }

  getCurrentSessionId(): string | null {
    return this.currentSession?.sessionId || null;
  }

  isSessionActive(): boolean {
    return this.currentSession !== null;
  }
}

// Export singleton instance
export const performanceTracker = new EndToEndPerformanceTracker();
