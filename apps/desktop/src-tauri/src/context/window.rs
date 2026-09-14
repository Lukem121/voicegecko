#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowContext {
    pub title: String,
    pub process_name: Option<String>,
}

pub fn gather_active_window_context() -> WindowContext {
    #[cfg(target_os = "windows")]
    {
        return gather_windows_context();
    }
    #[cfg(not(target_os = "windows"))]
    {
        WindowContext {
            title: String::new(),
            process_name: None,
        }
    }
}

#[cfg(target_os = "windows")]
fn gather_windows_context() -> WindowContext {
    use sysinfo::{Pid, ProcessesToUpdate, System};
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId,
    };

    unsafe {
        let hwnd: HWND = GetForegroundWindow();
        if hwnd.0.is_null() {
            return WindowContext {
                title: String::new(),
                process_name: None,
            };
        }

        let mut title_buf = [0u16; 512];
        let len = GetWindowTextW(hwnd, &mut title_buf);
        let title = String::from_utf16_lossy(&title_buf[..len as usize]);

        let mut pid = 0u32;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));

        let process_name = if pid > 0 {
            let pid_key = Pid::from_u32(pid);
            let mut system = System::new();
            system.refresh_processes(ProcessesToUpdate::Some(&[pid_key]), true);
            system
                .process(pid_key)
                .map(|p| p.name().to_string_lossy().into_owned())
        } else {
            None
        };

        WindowContext { title, process_name }
    }
}
