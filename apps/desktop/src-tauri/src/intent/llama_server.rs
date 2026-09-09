use crate::intent::profiles::IntentProfile;
use tauri::Manager;

pub async fn polish_text(text: &str) -> Result<String, String> {
    polish_text_with_profile(text, IntentProfile::General, None, None, None).await
}

pub async fn polish_text_with_profile(
    text: &str,
    profile: IntentProfile,
    dictionary: Option<&str>,
    dev_context: Option<&str>,
    app: Option<&tauri::AppHandle>,
) -> Result<String, String> {
    if profile == IntentProfile::Raw {
        return Ok(text.to_string());
    }

    let url = std::env::var("VOICEGECKO_LLM_URL")
        .unwrap_or_else(|_| "http://127.0.0.1:8080".to_string());

    if url.starts_with("http://127.0.0.1") || url.starts_with("http://localhost") {
        if let Some(app_handle) = app {
            if let Some(manager) =
                app_handle.try_state::<std::sync::Arc<crate::intent::llama_process::LlamaProcessManager>>()
            {
                manager.ensure_running(app_handle).await?;
                if !manager.health_check().await {
                    return Err("Local llama-server is not healthy".into());
                }
            }
        }
    }

    let instruction = match profile {
        IntentProfile::Developer => {
            "You are a dictation cleanup assistant for developer mode. Output ONLY cleaned text. \
Preserve camelCase, PascalCase, snake_case, file paths, package names, and technical terms. \
Fix misheard programming words (useState, async, TypeScript, etc.). \
The user often dictates prompts for AI coding agents — keep imperative, precise technical language. \
Do not wrap prose in code blocks."
        }
        IntentProfile::Formal => {
            "You are a dictation cleanup assistant. Output ONLY formal, polished prose. Fix grammar and punctuation. Expand contractions where appropriate."
        }
        IntentProfile::Chat => {
            "You are a dictation cleanup assistant. Light cleanup only. Keep casual tone and short sentences."
        }
        IntentProfile::Raw => return Ok(text.to_string()),
        IntentProfile::General => {
            "You are a dictation cleanup assistant. Output ONLY cleaned text. Fix grammar, punctuation, and capitalization. Remove filler words (um, uh) unless meaningful. Resolve self-corrections (keep the corrected version). Do not add information."
        }
    };

    let mut system = instruction.to_string();
    if let Some(ctx) = dev_context.filter(|d| !d.trim().is_empty()) {
        system.push_str("\n\nAuthor context (preserve technical terms): ");
        system.push_str(ctx);
    }
    if let Some(words) = dictionary.filter(|d| !d.trim().is_empty()) {
        system.push_str(&format_dictionary_instruction(words));
    }

    let ocr_symbols = crate::context::ocr::capture_active_window_text().unwrap_or_default();
    if profile == IntentProfile::Developer && !ocr_symbols.is_empty() {
        system.push_str("\n\nVisible context symbols: ");
        system.push_str(&ocr_symbols);
    }

    let client = reqwest::Client::new();

    let chat_body = serde_json::json!({
        "model": "local",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": format!("Raw transcript:\n{text}")}
        ],
        "temperature": 0.2,
        "max_tokens": 256,
    });

    let chat_response = client
        .post(format!("{url}/v1/chat/completions"))
        .json(&chat_body)
        .send()
        .await;

    if let Ok(response) = chat_response {
        if response.status().is_success() {
            let json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
            if let Some(content) = json
                .pointer("/choices/0/message/content")
                .and_then(|c| c.as_str())
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
            {
                return Ok(content);
            }
        }
    }

    // Fallback: legacy llama-server /completion endpoint
    let body = serde_json::json!({
        "prompt": format!("{system}\n\nRaw transcript:\n{text}\n\nCleaned text:"),
        "n_predict": 256,
        "temperature": 0.1,
    });

    let response = client
        .post(format!("{url}/completion"))
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("LLM server error: {}", response.status()));
    }

    let json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    json.get("content")
        .and_then(|c| c.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "Empty LLM response".to_string())
}

fn format_dictionary_instruction(words: &str) -> String {
    let terms: Vec<&str> = words
        .split(',')
        .map(str::trim)
        .filter(|term| !term.is_empty())
        .collect();
    if terms.is_empty() {
        return String::new();
    }

    let mut block = String::from(
        "\n\nDictionary terms — if the transcript contains a close match to any of these, \
spell that term exactly as written (same casing and spaces). Do not invent extra terms.\n",
    );
    for term in terms {
        block.push_str("- ");
        block.push_str(term);
        block.push('\n');
    }
    block
}

#[cfg(test)]
mod tests {
    use super::format_dictionary_instruction;

    #[test]
    fn lists_each_dictionary_term_on_its_own_line() {
        let block = format_dictionary_instruction("Social Fetch, Vercel");
        assert!(block.contains("spell that term exactly as written"));
        assert!(block.contains("- Social Fetch\n"));
        assert!(block.contains("- Vercel\n"));
    }
}
