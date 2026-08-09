use parking_lot::Mutex;
use std::sync::OnceLock;
use tauri::{AppHandle, Manager};

static APP_HANDLE: OnceLock<Mutex<Option<AppHandle>>> = OnceLock::new();

pub fn set_app_handle(app: AppHandle) {
    APP_HANDLE
        .get_or_init(|| Mutex::new(None))
        .lock()
        .replace(app);
}

pub fn open_db_global() -> Result<rusqlite::Connection, String> {
    let guard = APP_HANDLE
        .get_or_init(|| Mutex::new(None))
        .lock();
    let app = guard
        .as_ref()
        .ok_or("App handle not initialized for database")?;
    open_db(app)
}

pub fn db_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|d| d.join("voicegecko_v2.db"))
        .map_err(|e| e.to_string())
}

pub fn open_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    let path = db_path(app)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let conn = rusqlite::Connection::open(&path).map_err(|e| e.to_string())?;
    run_migrations(&conn)?;
    Ok(conn)
}

fn run_migrations(conn: &rusqlite::Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS dictations (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            raw_text TEXT,
            polished_text TEXT,
            profile TEXT DEFAULT 'general',
            mode TEXT,
            engine_id TEXT,
            latency_ms INTEGER,
            window_title TEXT,
            process_name TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS engine_feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            engine_id TEXT NOT NULL,
            clip_id TEXT,
            rating INTEGER,
            notes TEXT,
            mode TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS settings_v3 (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS dictionary (
            id TEXT PRIMARY KEY,
            word TEXT NOT NULL UNIQUE,
            replacement TEXT,
            source TEXT NOT NULL DEFAULT 'manual',
            use_count INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS dictionary_fts USING fts5(word);

        CREATE TABLE IF NOT EXISTS corrections (
            id TEXT PRIMARY KEY,
            original TEXT NOT NULL,
            corrected TEXT NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
        );

        CREATE TABLE IF NOT EXISTS undo_stack (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            pasted_text TEXT NOT NULL,
            previous_clipboard TEXT,
            pasted INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
        );
        ",
    )
    .map_err(|e| e.to_string())?;

    // Backfill columns on older DBs
    let _ = conn.execute("ALTER TABLE dictations ADD COLUMN raw_text TEXT", []);
    let _ = conn.execute("ALTER TABLE dictations ADD COLUMN polished_text TEXT", []);
    let _ = conn.execute("ALTER TABLE dictations ADD COLUMN profile TEXT DEFAULT 'general'", []);
    let _ = conn.execute("ALTER TABLE dictations ADD COLUMN mode TEXT", []);
    let _ = conn.execute("ALTER TABLE dictations ADD COLUMN window_title TEXT", []);
    let _ = conn.execute("ALTER TABLE dictations ADD COLUMN process_name TEXT", []);

    Ok(())
}

pub fn save_dictation(
    conn: &rusqlite::Connection,
    id: &str,
    content: &str,
    engine_id: &str,
    latency_ms: u64,
) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO dictations (id, content, polished_text, engine_id, latency_ms) VALUES (?1, ?2, ?2, ?3, ?4)",
        rusqlite::params![id, content, engine_id, latency_ms as i64],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn save_dictation_rich(
    conn: &rusqlite::Connection,
    id: &str,
    raw_text: &str,
    polished_text: &str,
    profile: &str,
    mode: &str,
    engine_id: &str,
    latency_ms: u64,
    window_title: Option<&str>,
    process_name: Option<&str>,
) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO dictations (id, content, raw_text, polished_text, profile, mode, engine_id, latency_ms, window_title, process_name)
         VALUES (?1, ?2, ?3, ?2, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![
            id,
            polished_text,
            raw_text,
            profile,
            mode,
            engine_id,
            latency_ms as i64,
            window_title,
            process_name,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn save_engine_feedback(
    conn: &rusqlite::Connection,
    engine_id: &str,
    clip_id: Option<&str>,
    rating: i32,
    notes: Option<&str>,
) -> Result<(), String> {
    conn.execute(
        "INSERT INTO engine_feedback (engine_id, clip_id, rating, notes) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![engine_id, clip_id, rating, notes],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn save_undo_entry(
    conn: &rusqlite::Connection,
    session_id: &str,
    pasted_text: &str,
    pasted: bool,
    previous_clipboard: Option<&str>,
) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO undo_stack (id, session_id, pasted_text, previous_clipboard, pasted)
         VALUES (?1, ?1, ?2, ?3, ?4)",
        rusqlite::params![session_id, pasted_text, previous_clipboard, pasted as i32],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn save_correction(
    conn: &rusqlite::Connection,
    original: &str,
    corrected: &str,
) -> Result<(), String> {
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO corrections (id, original, corrected) VALUES (?1, ?2, ?3)",
        rusqlite::params![id, original, corrected],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn upsert_dictionary_word(conn: &rusqlite::Connection, word: &str) -> Result<(), String> {
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT OR IGNORE INTO dictionary (id, word) VALUES (?1, ?2)",
        rusqlite::params![id, word],
    )
    .map_err(|e| e.to_string())?;
    let _ = conn.execute(
        "INSERT OR IGNORE INTO dictionary_fts (word) VALUES (?1)",
        rusqlite::params![word],
    );
    Ok(())
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalDictionaryRow {
    pub id: String,
    pub word: String,
    pub created_at: i64,
}

pub fn add_dictionary_word(
    conn: &rusqlite::Connection,
    word: &str,
) -> Result<LocalDictionaryRow, String> {
    let trimmed = word.trim();
    if trimmed.is_empty() {
        return Err("Word cannot be empty".into());
    }

    let existing: Option<(String, String, i64)> = conn
        .query_row(
            "SELECT id, word, created_at FROM dictionary WHERE lower(word) = lower(?1) LIMIT 1",
            rusqlite::params![trimmed],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .ok();

    if let Some((id, word, created_at)) = existing {
        return Ok(LocalDictionaryRow {
            id,
            word,
            created_at,
        });
    }

    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO dictionary (id, word) VALUES (?1, ?2)",
        rusqlite::params![id, trimmed],
    )
    .map_err(|e| e.to_string())?;
    let _ = conn.execute(
        "INSERT OR IGNORE INTO dictionary_fts (word) VALUES (?1)",
        rusqlite::params![trimmed],
    );

    let created_at: i64 = conn
        .query_row(
            "SELECT created_at FROM dictionary WHERE id = ?1",
            rusqlite::params![id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(LocalDictionaryRow {
        id,
        word: trimmed.to_string(),
        created_at,
    })
}

pub fn update_dictionary_word(
    conn: &rusqlite::Connection,
    id: &str,
    word: &str,
) -> Result<LocalDictionaryRow, String> {
    let trimmed = word.trim();
    if trimmed.is_empty() {
        return Err("Word cannot be empty".into());
    }

    let old_word: String = conn
        .query_row(
            "SELECT word FROM dictionary WHERE id = ?1",
            rusqlite::params![id],
            |row| row.get(0),
        )
        .map_err(|_| "Dictionary entry not found".to_string())?;

    conn.execute(
        "UPDATE dictionary SET word = ?1 WHERE id = ?2",
        rusqlite::params![trimmed, id],
    )
    .map_err(|e| e.to_string())?;

    let _ = conn.execute(
        "DELETE FROM dictionary_fts WHERE word = ?1",
        rusqlite::params![old_word],
    );
    let _ = conn.execute(
        "INSERT OR IGNORE INTO dictionary_fts (word) VALUES (?1)",
        rusqlite::params![trimmed],
    );

    let created_at: i64 = conn
        .query_row(
            "SELECT created_at FROM dictionary WHERE id = ?1",
            rusqlite::params![id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(LocalDictionaryRow {
        id: id.to_string(),
        word: trimmed.to_string(),
        created_at,
    })
}

pub fn delete_dictionary_word(conn: &rusqlite::Connection, id: &str) -> Result<(), String> {
    let old_word: String = conn
        .query_row(
            "SELECT word FROM dictionary WHERE id = ?1",
            rusqlite::params![id],
            |row| row.get(0),
        )
        .map_err(|_| "Dictionary entry not found".to_string())?;

    conn.execute(
        "DELETE FROM dictionary WHERE id = ?1",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;
    let _ = conn.execute(
        "DELETE FROM dictionary_fts WHERE word = ?1",
        rusqlite::params![old_word],
    );
    Ok(())
}

pub fn list_dictionary_words(
    conn: &rusqlite::Connection,
    sort_by: &str,
) -> Result<Vec<LocalDictionaryRow>, String> {
    let order = match sort_by {
        "newest" => "created_at DESC",
        "oldest" => "created_at ASC",
        _ => "lower(word) ASC",
    };

    let sql = format!("SELECT id, word, created_at FROM dictionary ORDER BY {order}");
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(LocalDictionaryRow {
                id: row.get(0)?,
                word: row.get(1)?,
                created_at: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

pub fn get_dictionary_prompt(conn: &rusqlite::Connection) -> Result<Option<String>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT word FROM dictionary ORDER BY use_count DESC, word ASC LIMIT 200",
        )
        .map_err(|e| e.to_string())?;

    let words = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>();

    if words.is_empty() {
        Ok(None)
    } else {
        Ok(Some(words.join(", ")))
    }
}

pub fn pop_undo_entry(
    conn: &rusqlite::Connection,
) -> Option<(String, String, bool, Option<String>)> {
    let mut stmt = conn
        .prepare(
            "SELECT session_id, pasted_text, pasted, previous_clipboard
             FROM undo_stack ORDER BY created_at DESC LIMIT 1",
        )
        .ok()?;

    let row = stmt
        .query_row([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i32>(2)? != 0,
                row.get::<_, Option<String>>(3)?,
            ))
        })
        .ok()?;

    let _ = conn.execute(
        "DELETE FROM undo_stack WHERE id = ?1",
        rusqlite::params![row.0],
    );

    Some(row)
}

pub fn hydrate_undo_stack(conn: &rusqlite::Connection) -> Result<(), String> {
    let mut stmt = conn
        .prepare(
            "SELECT session_id, pasted_text, pasted, previous_clipboard
             FROM undo_stack ORDER BY created_at DESC LIMIT 16",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i32>(2)? != 0,
                row.get::<_, Option<String>>(3)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    crate::inject::undo::load_entries(
        rows.filter_map(|r| r.ok()).collect::<Vec<_>>(),
    );
    Ok(())
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalDictationRow {
    pub id: String,
    pub content: String,
    pub engine_id: Option<String>,
    pub mode: Option<String>,
    pub created_at: String,
}

pub fn list_local_dictations(
    conn: &rusqlite::Connection,
    limit: usize,
) -> Result<Vec<LocalDictationRow>, String> {
    list_local_dictations_filtered(conn, limit, None, None)
}

pub fn list_local_dictations_filtered(
    conn: &rusqlite::Connection,
    limit: usize,
    search: Option<&str>,
    cursor: Option<&str>,
) -> Result<Vec<LocalDictationRow>, String> {
    let search_term = search.map(str::trim).filter(|s| !s.is_empty());
    let limit_i = limit as i64;

    let map_row = |row: &rusqlite::Row<'_>| -> rusqlite::Result<LocalDictationRow> {
        Ok(LocalDictationRow {
            id: row.get(0)?,
            content: row.get(1)?,
            engine_id: row.get(2)?,
            mode: row.get(3)?,
            created_at: row.get(4)?,
        })
    };

    match (search_term, cursor) {
        (Some(term), Some(cursor_id)) => {
            let pattern = format!("%{term}%");
            let mut stmt = conn
                .prepare(
                    "SELECT id, content, engine_id, mode, created_at
                     FROM dictations
                     WHERE content LIKE ?1
                       AND created_at < COALESCE(
                         (SELECT created_at FROM dictations WHERE id = ?2),
                         datetime('now')
                       )
                     ORDER BY created_at DESC
                     LIMIT ?3",
                )
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map(rusqlite::params![pattern, cursor_id, limit_i], map_row)
                .map_err(|e| e.to_string())?;
            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())
        }
        (Some(term), None) => {
            let pattern = format!("%{term}%");
            let mut stmt = conn
                .prepare(
                    "SELECT id, content, engine_id, mode, created_at
                     FROM dictations
                     WHERE content LIKE ?1
                     ORDER BY created_at DESC
                     LIMIT ?2",
                )
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map(rusqlite::params![pattern, limit_i], map_row)
                .map_err(|e| e.to_string())?;
            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())
        }
        (None, Some(cursor_id)) => {
            let mut stmt = conn
                .prepare(
                    "SELECT id, content, engine_id, mode, created_at
                     FROM dictations
                     WHERE created_at < COALESCE(
                       (SELECT created_at FROM dictations WHERE id = ?1),
                       datetime('now')
                     )
                     ORDER BY created_at DESC
                     LIMIT ?2",
                )
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map(rusqlite::params![cursor_id, limit_i], map_row)
                .map_err(|e| e.to_string())?;
            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())
        }
        (None, None) => {
            let mut stmt = conn
                .prepare(
                    "SELECT id, content, engine_id, mode, created_at
                     FROM dictations ORDER BY created_at DESC LIMIT ?1",
                )
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map(rusqlite::params![limit_i], map_row)
                .map_err(|e| e.to_string())?;
            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())
        }
    }
}

pub fn delete_local_dictation(conn: &rusqlite::Connection, id: &str) -> Result<(), String> {
    let changed = conn
        .execute(
            "DELETE FROM dictations WHERE id = ?1",
            rusqlite::params![id],
        )
        .map_err(|e| e.to_string())?;
    if changed == 0 {
        return Err("Dictation not found".into());
    }
    Ok(())
}

pub fn count_local_dictations(
    conn: &rusqlite::Connection,
    search: Option<&str>,
) -> Result<usize, String> {
    let search_term = search.map(str::trim).filter(|s| !s.is_empty());
    match search_term {
        Some(term) => {
            let pattern = format!("%{term}%");
            conn.query_row(
                "SELECT COUNT(*) FROM dictations WHERE content LIKE ?1",
                rusqlite::params![pattern],
                |row| row.get::<_, i64>(0),
            )
            .map(|n| n as usize)
            .map_err(|e| e.to_string())
        }
        None => conn
            .query_row("SELECT COUNT(*) FROM dictations", [], |row| {
                row.get::<_, i64>(0)
            })
            .map(|n| n as usize)
            .map_err(|e| e.to_string()),
    }
}
