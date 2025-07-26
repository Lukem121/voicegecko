use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize};
use tauri_plugin_positioner::{Position as PositionerPosition, WindowExt};

#[cfg(target_os = "windows")]
use windows::Win32::Foundation::RECT;
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{
    GetForegroundWindow, GetSystemMetrics, GetWindowRect, SystemParametersInfoW, SM_CXSCREEN,
    SM_CYSCREEN, SPI_GETWORKAREA, SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS,
};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GeckoBarNotification {
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub priority: Option<String>,
}

impl GeckoBarNotification {
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            duration: None,
            priority: None,
        }
    }

    pub fn with_duration(mut self, duration: u32) -> Self {
        self.duration = Some(duration);
        self
    }

    pub fn with_priority(mut self, priority: &str) -> Self {
        self.priority = Some(priority.to_string());
        self
    }
}

/// Emit a notification to the gecko bar
pub fn emit_gecko_bar_notification(
    app: &AppHandle,
    notification: GeckoBarNotification,
) -> Result<(), String> {
    app.emit("gecko-bar-notification", notification)
        .map_err(|e| e.to_string())
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GeckoBarState {
    pub visible: bool,
    pub expanded: bool,
    pub recording: bool,
}

impl Default for GeckoBarState {
    fn default() -> Self {
        Self {
            visible: false,
            expanded: false,
            recording: false,
        }
    }
}

/// Get the work area dimensions (screen area excluding taskbar) using Windows API
#[cfg(target_os = "windows")]
fn get_work_area() -> Option<(i32, i32, i32, i32)> {
    unsafe {
        let mut rect = RECT::default();
        let result = SystemParametersInfoW(
            SPI_GETWORKAREA,
            0,
            Some(&mut rect as *mut RECT as *mut _),
            SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS(0),
        );

        if result.is_ok() {
            Some((rect.left, rect.top, rect.right, rect.bottom))
        } else {
            None
        }
    }
}

/// Fallback for non-Windows platforms
#[cfg(not(target_os = "windows"))]
fn get_work_area() -> Option<(i32, i32, i32, i32)> {
    None
}

/// Calculate taskbar offset by comparing monitor size with work area
fn calculate_taskbar_offset(monitor_size: &PhysicalSize<u32>) -> (u32, u32) {
    #[cfg(target_os = "windows")]
    {
        if let Some((work_left, work_top, work_right, work_bottom)) = get_work_area() {
            let work_width = (work_right - work_left) as u32;
            let work_height = (work_bottom - work_top) as u32;

            // Calculate taskbar dimensions
            let taskbar_width = monitor_size.width.saturating_sub(work_width);
            let taskbar_height = monitor_size.height.saturating_sub(work_height);

            // Monitor info available for debugging if needed

            return (taskbar_width, taskbar_height);
        }
    }

    // Fallback to reasonable defaults for non-Windows or if API fails
    (0, 48) // Default Windows taskbar height
}

#[tauri::command]
pub fn show_gecko_bar(app: AppHandle) -> Result<(), String> {
    // Check if gecko bar is enabled in settings
    use crate::modules::settings::get_gecko_bar_config;

    let config = get_gecko_bar_config(app.clone())?;
    if !config.enabled {
        return Ok(());
    }

    if let Some(window) = app.get_webview_window("gecko-bar") {
        // Check if window is already visible
        let is_visible = window.is_visible().unwrap_or(false);

        if is_visible {
            // Even if visible, ensure it's positioned correctly
            position_gecko_bar(&window)?;
            return Ok(());
        }

        // Position the transparent window at bottom center
        position_gecko_bar(&window)?;

        // Show the window (already configured as 300x80px transparent in tauri.conf.json)
        window.show().map_err(|e| e.to_string())?;

        Ok(())
    } else {
        Err("Gecko bar window not found".to_string())
    }
}

#[tauri::command]
pub fn hide_gecko_bar(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("gecko-bar") {
        window.hide().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Gecko bar window not found".to_string())
    }
}

fn position_gecko_bar(window: &tauri::WebviewWindow) -> Result<(), String> {
    // Try using the Tauri positioner plugin first (more reliable)
    match position_gecko_bar_with_positioner(window) {
        Ok(_) => Ok(()),
        Err(e) => {
            println!("Positioner failed ({}), using manual positioning", e);
            position_gecko_bar_manual(window)
        }
    }
}

fn position_gecko_bar_with_positioner(window: &tauri::WebviewWindow) -> Result<(), String> {
    // Use the Tauri positioner plugin for more reliable positioning
    window
        .move_window(PositionerPosition::BottomCenter)
        .map_err(|e| e.to_string())?;

    // Get current position and adjust up to avoid taskbar
    let current_pos = window.outer_position().map_err(|e| e.to_string())?;

    // Get monitor information for dynamic taskbar calculation
    let monitor = window.primary_monitor().map_err(|e| e.to_string())?;

    if let Some(monitor) = monitor {
        let monitor_size = monitor.size();

        // Calculate dynamic taskbar offset
        let (_taskbar_width, taskbar_height) = calculate_taskbar_offset(&monitor_size);

        // Use calculated taskbar height plus some margin
        let taskbar_offset = taskbar_height;

        let adjusted_position =
            PhysicalPosition::new(current_pos.x, current_pos.y - taskbar_offset as i32);

        // Ensure the position is visible on screen
        let final_position = if adjusted_position.x < 0 || adjusted_position.y < 0 {
            // Fallback to a safe position
            PhysicalPosition::new(
                (monitor_size.width / 2) as i32,
                monitor_size.height as i32 - 200, // 200px from bottom
            )
        } else {
            adjusted_position
        };

        window
            .set_position(final_position)
            .map_err(|e| e.to_string())?;
    } else {
        return Err("Could not get monitor information".to_string());
    }

    Ok(())
}

fn position_gecko_bar_manual(window: &tauri::WebviewWindow) -> Result<(), String> {
    // Fallback to manual positioning if positioner fails
    let monitor = window.primary_monitor().map_err(|e| e.to_string())?;

    if let Some(monitor) = monitor {
        let monitor_size = monitor.size();
        let monitor_position = monitor.position();
        let window_size = window.outer_size().map_err(|e| e.to_string())?;

        // Calculate dynamic taskbar offset
        let (_taskbar_width, taskbar_height) = calculate_taskbar_offset(&monitor_size);

        // Calculate position for bottom center with proper bounds checking
        let margin_from_bottom = 10u32; // Base margin from bottom
        let margin_from_edges = 10u32;

        // Use the calculated taskbar height instead of hardcoded value
        let total_bottom_margin = margin_from_bottom + taskbar_height;

        // Ensure minimum distance from screen edges and taskbar
        let available_width = monitor_size.width.saturating_sub(margin_from_edges * 2);
        let available_height = monitor_size.height.saturating_sub(total_bottom_margin);

        // Calculate center position
        let center_x = if window_size.width <= available_width {
            monitor_position.x + ((monitor_size.width - window_size.width) / 2) as i32
        } else {
            monitor_position.x + margin_from_edges as i32
        };

        let x = center_x;

        let y = if window_size.height <= available_height {
            monitor_position.y
                + (monitor_size.height - window_size.height - total_bottom_margin) as i32
        } else {
            monitor_position.y + (monitor_size.height - window_size.height - taskbar_height) as i32
        };

        // Ensure position is within screen bounds (but above taskbar)
        let final_x = x
            .max(monitor_position.x)
            .min(monitor_position.x + monitor_size.width as i32 - window_size.width as i32);
        let final_y = y.max(monitor_position.y).min(
            monitor_position.y + monitor_size.height as i32
                - window_size.height as i32
                - taskbar_height as i32,
        );

        let position = PhysicalPosition::new(final_x, final_y);
        window.set_position(position).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn is_gecko_bar_visible(app: AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window("gecko-bar") {
        window.is_visible().map_err(|e| e.to_string())
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub fn reposition_gecko_bar(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("gecko-bar") {
        position_gecko_bar(&window)?;
        Ok(())
    } else {
        Err("Gecko bar window not found".to_string())
    }
}

#[tauri::command]
pub fn is_fullscreen_app_active(_app: AppHandle) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        unsafe {
            // Get the foreground window (currently active window)
            let foreground_window = GetForegroundWindow();

            // Check if we got a valid window handle
            if foreground_window.is_invalid() {
                return Ok(false);
            }

            // Get the window rect
            let mut window_rect = RECT::default();
            if GetWindowRect(foreground_window, &mut window_rect).is_err() {
                return Ok(false);
            }

            // Get screen dimensions
            let screen_width = GetSystemMetrics(SM_CXSCREEN);
            let screen_height = GetSystemMetrics(SM_CYSCREEN);

            // Calculate window dimensions
            let window_width = window_rect.right - window_rect.left;
            let window_height = window_rect.bottom - window_rect.top;

            // Check if window covers the entire screen (with small tolerance for rounding errors)
            // Increased tolerance to 10 pixels to better handle different window styles
            let tolerance = 10;
            let is_fullscreen = window_rect.left <= tolerance
                && window_rect.top <= tolerance
                && window_width >= screen_width - tolerance
                && window_height >= screen_height - tolerance;

            Ok(is_fullscreen)
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        // For non-Windows platforms, we can't easily detect other apps' fullscreen state
        // So we'll just return false for now
        Ok(false)
    }
}

#[tauri::command]
pub fn set_gecko_bar_fullscreen_mode(app: AppHandle, is_fullscreen: bool) -> Result<(), String> {
    if is_fullscreen {
        // Hide gecko bar during fullscreen
        hide_gecko_bar(app)
    } else {
        // Show gecko bar when not in fullscreen (will check if enabled)
        show_gecko_bar(app)
    }
}

#[tauri::command]
pub fn send_gecko_bar_notification(
    app: AppHandle,
    message: String,
    duration: Option<u32>,
    priority: Option<String>,
) -> Result<(), String> {
    let notification = GeckoBarNotification {
        message,
        duration,
        priority,
    };

    // Try to show gecko bar if it's enabled
    let _ = show_gecko_bar(app.clone());

    emit_gecko_bar_notification(&app, notification)
}
