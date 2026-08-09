//! OCR context gathering — Windows screen text extraction stub.

pub fn capture_active_window_text() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        // Full Windows.Media.Ocr integration requires WinRT bindings.
        // Return empty until OCR pipeline is wired in Phase 7.
        Ok(String::new())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("OCR is only supported on Windows".into())
    }
}
