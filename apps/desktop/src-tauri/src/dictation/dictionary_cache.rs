use parking_lot::Mutex;
use tauri::{AppHandle, Manager};

pub struct DictionaryPromptCache {
    prompt: Mutex<Option<String>>,
}

impl DictionaryPromptCache {
    pub fn new() -> Self {
        Self {
            prompt: Mutex::new(None),
        }
    }

    pub fn set(&self, prompt: Option<String>) {
        *self.prompt.lock() = prompt.filter(|p| !p.trim().is_empty());
    }

    pub fn get(&self) -> Option<String> {
        self.prompt.lock().clone()
    }
}

impl Default for DictionaryPromptCache {
    fn default() -> Self {
        Self::new()
    }
}

pub fn get_cached_prompt(app: &AppHandle) -> Option<String> {
    app.try_state::<DictionaryPromptCache>()
        .map(|c| c.get())
        .flatten()
}
