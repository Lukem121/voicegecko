use parking_lot::Mutex;
use tauri::{AppHandle, Manager};

use crate::context::window::gather_active_window_context;
use crate::intent::profiles::IntentProfile;

/// Max Whisper initial-prompt length (model limit is ~224 tokens).
const MAX_HINT_CHARS: usize = 900;
/// Keep this much room for vocabulary so window titles cannot push it off the end.
const VOCAB_RESERVE_CHARS: usize = 450;

const DEVELOPER_SEED: &str = "Software engineering discussion with AI coding agents. \
TypeScript, JavaScript, Rust, React, Tauri, async, await, API, git, npm, Cursor, VoiceGecko.";

pub struct TranscriptionHintState {
    hint: Mutex<Option<String>>,
    dev_context: Mutex<Option<String>>,
}

impl TranscriptionHintState {
    pub fn new() -> Self {
        Self {
            hint: Mutex::new(None),
            dev_context: Mutex::new(None),
        }
    }

    pub fn set_session(
        &self,
        hint: Option<String>,
        dev_context: Option<String>,
    ) {
        *self.hint.lock() = hint.filter(|h| !h.trim().is_empty());
        *self.dev_context.lock() = dev_context.filter(|c| !c.trim().is_empty());
    }

    pub fn clear_session(&self) {
        *self.hint.lock() = None;
        *self.dev_context.lock() = None;
    }

    pub fn hint(&self) -> Option<String> {
        self.hint.lock().clone()
    }

    pub fn dev_context(&self) -> Option<String> {
        self.dev_context.lock().clone()
    }
}

impl Default for TranscriptionHintState {
    fn default() -> Self {
        Self::new()
    }
}

pub fn get_session_hint(app: &AppHandle) -> Option<String> {
    app.try_state::<TranscriptionHintState>()
        .and_then(|s| s.hint())
}

pub fn get_dev_context(app: &AppHandle) -> Option<String> {
    app.try_state::<TranscriptionHintState>()
        .and_then(|s| s.dev_context())
}

pub fn prepare_session(
    app: &AppHandle,
    dev_context: Option<&str>,
    force_developer_profile: bool,
    dictionary: Option<&str>,
) {
    let window = gather_active_window_context();
    let profile = if force_developer_profile {
        IntentProfile::Developer
    } else {
        crate::intent::profiles::detect_profile_from_window(&window)
    };

    let hint = build_transcription_hint(
        profile,
        dev_context,
        dictionary,
        Some(&window.title),
    );

    let dev = dev_context.map(str::trim).filter(|s| !s.is_empty()).map(str::to_string);

    if let Some(store) = app.try_state::<TranscriptionHintState>() {
        store.set_session(hint, dev);
    }
}

pub fn clear_session(app: &AppHandle) {
    if let Some(store) = app.try_state::<TranscriptionHintState>() {
        store.clear_session();
    }
}

pub fn build_transcription_hint(
    profile: IntentProfile,
    dev_context: Option<&str>,
    dictionary: Option<&str>,
    window_title: Option<&str>,
) -> Option<String> {
    let vocabulary = format_vocabulary_segment(dictionary)
        .map(|vocab| truncate_vocabulary(&vocab, MAX_HINT_CHARS))
        .filter(|vocab| !vocab.is_empty());
    let mut prefix_segments: Vec<String> = Vec::new();

    if profile == IntentProfile::Developer {
        prefix_segments.push(DEVELOPER_SEED.to_string());
    }

    if let Some(ctx) = dev_context.map(str::trim).filter(|s| !s.is_empty()) {
        prefix_segments.push(format!("Context: {ctx}"));
    }

    if let Some(title) = window_title.map(str::trim).filter(|s| !s.is_empty()) {
        prefix_segments.push(format!("Active window: {title}"));
    }

    if prefix_segments.is_empty() && vocabulary.is_none() {
        return None;
    }

    let vocabulary = vocabulary.unwrap_or_default();
    let prefix_budget = if vocabulary.is_empty() {
        MAX_HINT_CHARS
    } else {
        MAX_HINT_CHARS
            .saturating_sub(vocabulary.len())
            .saturating_sub(1)
            .min(MAX_HINT_CHARS.saturating_sub(VOCAB_RESERVE_CHARS.min(vocabulary.len())))
    };

    let prefix = truncate_at_boundary(&prefix_segments.join(" "), prefix_budget, ' ');
    match (prefix.is_empty(), vocabulary.is_empty()) {
        (true, true) => None,
        (true, false) => Some(vocabulary),
        (false, true) => Some(prefix),
        (false, false) => Some(format!("{prefix} {vocabulary}")),
    }
}

fn parse_dictionary_terms(raw: &str) -> Vec<String> {
    let mut terms = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for part in raw.split(',') {
        let term = part.trim();
        if term.is_empty() {
            continue;
        }
        let key = term.to_ascii_lowercase();
        if seen.insert(key) {
            terms.push(term.to_string());
        }
    }

    terms
}

fn format_vocabulary_segment(dictionary: Option<&str>) -> Option<String> {
    let raw = dictionary.map(str::trim).filter(|s| !s.is_empty())?;
    let terms = parse_dictionary_terms(raw);
    if terms.is_empty() {
        return None;
    }

    Some(finished_vocabulary_sentence(&terms))
}

/// Whisper treats `WithPrompt` as prior transcript. A finished sentence (period)
/// is much less likely to be echoed than a trailing comma-list of hotwords.
fn finished_vocabulary_sentence(terms: &[String]) -> String {
    match terms {
        [] => String::new(),
        [one] => format!("I already mentioned {one}."),
        [first, second] => format!("I already mentioned {first} and {second}."),
        _ => {
            let last = terms.last().expect("non-empty");
            let head = terms[..terms.len() - 1].join(", ");
            format!("I already mentioned {head}, and {last}.")
        }
    }
}

/// Drop a leading copy of the vocabulary sentence when Whisper echoes the prompt.
pub fn strip_leading_hint_echo(transcript: &str, hint: Option<&str>) -> String {
    let text = transcript.trim();
    if text.is_empty() {
        return String::new();
    }

    let Some(hint) = hint.map(str::trim).filter(|value| !value.is_empty()) else {
        return text.to_string();
    };

    if let Some(sentence) = vocabulary_sentence_from_hint(hint) {
        let without_period = sentence.trim_end_matches('.');
        if text.eq_ignore_ascii_case(&sentence) || text.eq_ignore_ascii_case(without_period) {
            return String::new();
        }
        if let Some(inner) = without_period
            .strip_prefix("I already mentioned ")
            .map(str::trim)
        {
            let text_bare = text.trim_end_matches('.');
            if text.eq_ignore_ascii_case(inner) || text_bare.eq_ignore_ascii_case(inner) {
                return String::new();
            }
        }
        for candidate in [sentence.as_str(), without_period] {
            if let Some(rest) = strip_prefix_ignore_ascii_case(text, candidate) {
                return rest
                    .trim_start_matches([' ', ',', ';', ':', '.', '-', '—'])
                    .trim()
                    .to_string();
            }
        }
    }

    if let Some(rest) = strip_prefix_ignore_ascii_case(text, "Vocabulary:") {
        let rest = rest.trim_start();
        if rest.is_empty() {
            return String::new();
        }
        return rest.to_string();
    }

    text.to_string()
}

fn vocabulary_sentence_from_hint(hint: &str) -> Option<String> {
    const MARKER: &str = "I already mentioned ";
    let start = hint.rfind(MARKER)?;
    let slice = hint[start..].trim();
    let end = slice.find('.').map_or(slice.len(), |idx| idx + 1);
    let sentence = slice[..end].trim();
    if sentence.is_empty() {
        None
    } else {
        Some(sentence.to_string())
    }
}

fn strip_prefix_ignore_ascii_case<'a>(text: &'a str, prefix: &str) -> Option<&'a str> {
    let prefix = prefix.trim();
    if prefix.is_empty() || text.len() < prefix.len() {
        return None;
    }

    let (head, tail) = text.split_at(prefix.len());
    if head.eq_ignore_ascii_case(prefix) {
        Some(tail)
    } else {
        None
    }
}

fn truncate_at_boundary(text: &str, max_chars: usize, separator: char) -> String {
    if text.len() <= max_chars {
        return text.to_string();
    }
    if max_chars == 0 {
        return String::new();
    }

    let mut end = max_chars.min(text.len());
    while end > 0 && !text.is_char_boundary(end) {
        end -= 1;
    }
    let sliced = &text[..end];
    if let Some(idx) = sliced.rfind(separator) {
        sliced[..idx].trim_end().to_string()
    } else {
        sliced.trim_end().to_string()
    }
}

fn truncate_vocabulary(vocabulary: &str, max_chars: usize) -> String {
    truncate_at_boundary(vocabulary, max_chars, ',')
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn developer_hint_includes_seed_and_dictionary() {
        let hint = build_transcription_hint(
            IntentProfile::Developer,
            Some("VoiceGecko desktop app"),
            Some("useState, Tauri"),
            Some("session.rs — voicegecko"),
        )
        .expect("hint");

        assert!(hint.contains("Software engineering"));
        assert!(hint.contains("VoiceGecko desktop app"));
        assert!(hint.contains("useState"));
        assert!(hint.contains("session.rs"));
    }

    #[test]
    fn general_profile_omits_developer_seed() {
        let hint = build_transcription_hint(
            IntentProfile::General,
            None,
            Some("Acme Corp"),
            None,
        )
        .expect("hint");

        assert!(!hint.contains("coding agents"));
        assert!(hint.contains("Acme Corp"));
        assert!(hint.ends_with("I already mentioned Acme Corp."));
    }

    #[test]
    fn vocabulary_is_a_finished_sentence() {
        let hint = build_transcription_hint(
            IntentProfile::General,
            None,
            Some("Social Fetch, Vercel"),
            None,
        )
        .expect("hint");

        assert_eq!(
            hint,
            "I already mentioned Social Fetch and Vercel."
        );
        assert!(!hint.contains("Vocabulary:"));
        assert!(!hint.contains("Social Fetch, Social Fetch"));
    }

    #[test]
    fn vocabulary_survives_long_window_title() {
        let long_title = "x".repeat(1200);
        let hint = build_transcription_hint(
            IntentProfile::Developer,
            Some("VoiceGecko desktop app"),
            Some("Social Fetch, Vercel"),
            Some(&long_title),
        )
        .expect("hint");

        assert!(hint.contains("Social Fetch"));
        assert!(hint.contains("Vercel"));
        assert!(hint.contains("I already mentioned"));
        assert!(hint.ends_with("Vercel."));
        assert!(hint.len() <= MAX_HINT_CHARS);
        let vocab_at = hint.find("I already mentioned").expect("vocabulary last");
        assert!(vocab_at > 0);
        assert!(!hint[vocab_at..].contains("Active window"));
    }

    #[test]
    fn vocabulary_is_last_segment() {
        let hint = build_transcription_hint(
            IntentProfile::Developer,
            Some("desktop"),
            Some("BetterAuth"),
            Some("session.rs"),
        )
        .expect("hint");

        let vocab_at = hint.find("I already mentioned").expect("vocabulary");
        assert!(hint[vocab_at..].contains("BetterAuth"));
        assert!(hint[..vocab_at].contains("Software engineering"));
        assert!(hint[..vocab_at].contains("desktop"));
        assert!(hint[..vocab_at].contains("session.rs"));
    }

    #[test]
    fn strips_echoed_vocabulary_sentence_from_start() {
        let hint = "I already mentioned Social Fetch and Vercel.";
        let text = "I already mentioned Social Fetch and Vercel. Can you open Engine Lab?";
        assert_eq!(
            strip_leading_hint_echo(text, Some(hint)),
            "Can you open Engine Lab?"
        );
    }

    #[test]
    fn keeps_real_speech_that_starts_with_a_dictionary_term() {
        let hint = "I already mentioned Social Fetch and Vercel.";
        let text = "Social Fetch is down again.";
        assert_eq!(
            strip_leading_hint_echo(text, Some(hint)),
            "Social Fetch is down again."
        );
    }

    #[test]
    fn drops_transcript_that_is_only_the_prompt_names() {
        let hint = "I already mentioned Social Fetch and Vercel.";
        assert_eq!(
            strip_leading_hint_echo("Social Fetch and Vercel.", Some(hint)),
            ""
        );
    }
}
