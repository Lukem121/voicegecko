//! Spoken command detection — maps phrases to app actions.

const COMMANDS: &[(&str, &str)] = &[
    ("scratch that", "undo_last_dictation"),
    ("delete that", "undo_last_dictation"),
    ("undo that", "undo_last_dictation"),
    ("new paragraph", "insert_paragraph"),
    ("new line", "insert_newline"),
    ("select all", "select_all"),
    ("capitalize that", "capitalize"),
    ("all caps", "uppercase"),
    ("no caps", "lowercase"),
    ("no space", "no_space"),
    ("period", "insert_period"),
    ("full stop", "insert_period"),
    ("comma", "insert_comma"),
    ("question mark", "insert_question"),
    ("exclamation point", "insert_exclamation"),
    ("open quote", "insert_open_quote"),
    ("close quote", "insert_close_quote"),
    ("open paren", "insert_open_paren"),
    ("close paren", "insert_close_paren"),
    ("at sign", "insert_at"),
    ("hash", "insert_hash"),
    ("pound sign", "insert_hash"),
    ("backtick", "insert_backtick"),
    ("dot", "insert_dot"),
];

pub fn match_spoken_command(transcript: &str) -> Option<&'static str> {
    let lower = transcript.to_lowercase();
    for (phrase, action) in COMMANDS {
        if lower.contains(phrase) {
            return Some(action);
        }
    }
    None
}

pub fn apply_text_command(action: &str, text: &str) -> Option<String> {
    match action {
        "insert_paragraph" => Some(format!("{text}\n\n")),
        "insert_newline" => Some(format!("{text}\n")),
        "capitalize" => {
            let mut chars = text.chars();
            match chars.next() {
                None => Some(String::new()),
                Some(first) => Some(first.to_uppercase().collect::<String>() + chars.as_str()),
            }
        }
        "uppercase" => Some(text.to_uppercase()),
        "lowercase" => Some(text.to_lowercase()),
        "no_space" => {
            let trimmed = text.trim_end();
            Some(trimmed.replace(' ', ""))
        }
        "insert_period" => Some(format!("{text}.")),
        "insert_comma" => Some(format!("{text},")),
        "insert_question" => Some(format!("{text}?")),
        "insert_exclamation" => Some(format!("{text}!")),
        "insert_open_quote" => Some(format!("{text}\"")),
        "insert_close_quote" => Some(format!("{text}\"")),
        "insert_open_paren" => Some(format!("{text}(")),
        "insert_close_paren" => Some(format!("{text})")),
        "insert_at" => Some(format!("{text}@")),
        "insert_hash" => Some(format!("{text}#")),
        "insert_backtick" => Some(format!("{text}`")),
        "insert_dot" => Some(format!("{text}.")),
        _ => None,
    }
}
