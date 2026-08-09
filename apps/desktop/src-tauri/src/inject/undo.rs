use parking_lot::Mutex;
use std::collections::VecDeque;

#[derive(Clone)]
struct UndoEntry {
    session_id: String,
    text: String,
    pasted: bool,
    previous_clipboard: Option<String>,
}

static UNDO_STACK: once_cell::sync::Lazy<Mutex<VecDeque<UndoEntry>>> =
    once_cell::sync::Lazy::new(|| Mutex::new(VecDeque::with_capacity(16)));

pub fn load_entries(entries: Vec<(String, String, bool, Option<String>)>) {
    let mut stack = UNDO_STACK.lock();
    stack.clear();
    for (session_id, text, pasted, previous_clipboard) in entries.into_iter().rev() {
        stack.push_back(UndoEntry {
            session_id,
            text,
            pasted,
            previous_clipboard,
        });
    }
}

pub fn hydrate_from_db() {
    if !UNDO_STACK.lock().is_empty() {
        return;
    }
    if let Ok(conn) = crate::db::open_db_global() {
        let _ = crate::db::hydrate_undo_stack(&conn);
    }
}

pub fn record_dictation(
    session_id: &str,
    text: &str,
    pasted: bool,
    previous_clipboard: Option<String>,
) {
    let mut stack = UNDO_STACK.lock();
    stack.push_front(UndoEntry {
        session_id: session_id.to_string(),
        text: text.to_string(),
        pasted,
        previous_clipboard: previous_clipboard.clone(),
    });
    while stack.len() > 16 {
        stack.pop_back();
    }

    if let Ok(conn) = crate::db::open_db_global() {
        let _ = crate::db::save_undo_entry(
            &conn,
            session_id,
            text,
            pasted,
            previous_clipboard.as_deref(),
        );
    }
}

pub fn pop_last() -> Option<(String, String, bool, Option<String>)> {
    if let Some(entry) = UNDO_STACK.lock().pop_front() {
        return Some((
            entry.session_id,
            entry.text,
            entry.pasted,
            entry.previous_clipboard,
        ));
    }

    if let Ok(conn) = crate::db::open_db_global() {
        return crate::db::pop_undo_entry(&conn);
    }

    None
}

pub fn undo_pasted_chars(char_count: usize) -> Result<(), String> {
    use enigo::{Enigo, Key, Keyboard, Settings};
    use std::thread;
    use std::time::Duration;

    let mut enigo = Enigo::new(&Settings::default())
        .map_err(|e| format!("Failed to initialize keyboard controller: {e}"))?;

    thread::sleep(Duration::from_millis(30));
    for _ in 0..char_count {
        enigo
            .key(Key::Backspace, enigo::Direction::Click)
            .map_err(|e| e.to_string())?;
        thread::sleep(Duration::from_millis(2));
    }
    Ok(())
}
