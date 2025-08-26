# Tauri Clickthrough Demo

**Click‑through of arbitrary, dynamic shapes in Tauri – no per‑OS hacks**. Drag the red square to reposition the clickable area; everywhere else the window is transparent to the mouse.

## Features

| Feature                     | Notes                                                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Global mouse feed**       | Uses [`rdev`](https://crates.io/crates/rdev) to get device‑pixel coordinates even when the window ignores input. |
| **Dynamic hit‑box**         | Hitbox can be arbitrary shape and computed dynamically                                           |
| **Cross-platform, no hack**         | Powered by `WebviewWindow.setIgnoreCursorEvents(bool)` – works the same on macOS, Windows & Linux.               |

## How it works

1. **Rust side** – `hook.rs` listens to global mouse moves and emits a `device-mouse-move` event into the webview.
2. **React side** – receives that event, compares cursor coords (scaled by `devicePixelRatio`) with the current hit‑box, and calls `setIgnoreCursorEvents()` accordingly.
    A custom hitbox detection function can be passed here. This means, we can define **an irregular, changing hitbox programmatically**.
3. **Dragging** – while the box is dragged (`react-draggable`), click‑through is suspended so the handle always responds.