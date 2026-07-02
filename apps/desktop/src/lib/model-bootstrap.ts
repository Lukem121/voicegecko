import { log } from '@acme/observability/log';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { toast } from 'sonner';

type V2ModelDownloadProgressPayload = {
  modelId: string;
  progress: number;
  status: string;
};

const MODEL_LABELS: Record<string, string> = {
  bootstrap: 'speech models',
  silero_vad: 'Silero VAD',
  parakeet_tdt_v2: 'Parakeet STT',
  sherpa_sidecar: 'Parakeet runtime',
  llama_server: 'LLM server',
  qwen2_5_3b: 'Qwen polish model',
};

let bootstrapToastId: string | number | undefined;
let bootstrapInitialized = false;
let modelsReady = false;

const modelLabel = (modelId: string): string =>
  MODEL_LABELS[modelId] ?? modelId.replaceAll('_', ' ');

const dismissBootstrapToast = (): void => {
  if (bootstrapToastId !== undefined) {
    toast.dismiss(bootstrapToastId);
    bootstrapToastId = undefined;
  }
};

const updateBootstrapToast = (payload: V2ModelDownloadProgressPayload): void => {
  if (payload.modelId === 'bootstrap' && payload.status === 'complete') {
    return;
  }

  const label = modelLabel(payload.modelId);
  const message =
    payload.status === 'error'
      ? `Setup issue: ${label}`
      : `Setting up ${label}… ${payload.progress}%`;

  if (bootstrapToastId === undefined) {
    bootstrapToastId = toast.loading('Setting up speech models…', {
      description: message,
      duration: Number.POSITIVE_INFINITY,
    });
    return;
  }

  toast.loading('Setting up speech models…', {
    id: bootstrapToastId,
    description: message,
    duration: Number.POSITIVE_INFINITY,
  });
};

const showReadyToast = (): void => {
  if (modelsReady) {
    return;
  }
  modelsReady = true;
  dismissBootstrapToast();
  toast.success('Ready to dictate', {
    description: 'Press Ctrl+Shift+Z — live transcript shows as you speak.',
    duration: 5000,
  });
};

const retryBootstrap = (): void => {
  modelsReady = false;
  dismissBootstrapToast();
  bootstrapToastId = toast.loading('Setting up speech models…', {
    description: 'Retrying download…',
    duration: Number.POSITIVE_INFINITY,
  });
  void invoke('retry_v2_bootstrap').catch((retryError) => {
    log.warn(retryError, '[Bootstrap] Retry bootstrap failed');
    dismissBootstrapToast();
    toast.error('Could not restart model setup', {
      description:
        retryError instanceof Error ? retryError.message : String(retryError),
    });
  });
};

const showBootstrapFailedToast = (error: string): void => {
  dismissBootstrapToast();
  toast.error('Speech model setup failed', {
    description: error,
    duration: Number.POSITIVE_INFINITY,
    action: {
      label: 'Retry',
      onClick: retryBootstrap,
    },
  });
};

/**
 * Listen for first-run model bootstrap events from the Rust backend.
 */
export async function initializeModelBootstrapListeners(): Promise<void> {
  if (bootstrapInitialized) {
    return;
  }
  bootstrapInitialized = true;

  await listen<V2ModelDownloadProgressPayload>(
    'v2-model-download-progress',
    (event) => {
      const payload = event.payload;
      log.info('[Bootstrap] download progress', payload);
      updateBootstrapToast(payload);
    }
  );

  await listen('v2-models-ready', () => {
    log.info('[Bootstrap] required speech models ready');
    showReadyToast();
  });

  await listen<string>('v2-bootstrap-failed', (event) => {
    log.error('[Bootstrap] setup failed:', event.payload);
    showBootstrapFailedToast(event.payload);
  });

  try {
    const toggleReady = await invoke<boolean>('is_v2_toggle_ready');
    if (toggleReady) {
      showReadyToast();
    } else {
      bootstrapToastId = toast.loading('Setting up speech models…', {
        description:
          'First launch downloads speech models in the background. Keep the app open.',
        duration: Number.POSITIVE_INFINITY,
      });
    }
  } catch (error) {
    log.debug('[Bootstrap] Could not check toggle readiness', error);
  }
}

export async function isSpeechModelsReady(): Promise<boolean> {
  try {
    return await invoke<boolean>('is_v2_toggle_ready');
  } catch {
    return false;
  }
}

export async function retryBootstrapDownloads(): Promise<void> {
  retryBootstrap();
}
