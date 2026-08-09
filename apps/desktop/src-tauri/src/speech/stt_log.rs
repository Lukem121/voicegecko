//! Structured logging for speech-to-text engines and dictation pipelines.

pub const TARGET: &str = "speech";

#[inline]
pub fn debug(engine: &str, message: &str) {
    log::debug!(target: TARGET, "[{engine}] {message}");
}

#[inline]
pub fn info(engine: &str, message: &str) {
    log::info!(target: TARGET, "[{engine}] {message}");
}

#[inline]
pub fn warn(engine: &str, message: &str) {
    log::warn!(target: TARGET, "[{engine}] {message}");
}

#[inline]
pub fn error(engine: &str, message: &str) {
    log::error!(target: TARGET, "[{engine}] {message}");
}

#[inline]
pub fn info_fmt(engine: &str, message: impl std::fmt::Display) {
    info(engine, &message.to_string());
}

#[inline]
pub fn warn_fmt(engine: &str, message: impl std::fmt::Display) {
    warn(engine, &message.to_string());
}

#[inline]
pub fn error_fmt(engine: &str, message: impl std::fmt::Display) {
    error(engine, &message.to_string());
}
