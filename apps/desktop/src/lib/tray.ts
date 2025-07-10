import { defaultWindowIcon } from "@tauri-apps/api/app";
import { Menu } from "@tauri-apps/api/menu";
import { TrayIcon } from "@tauri-apps/api/tray";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { exit } from "@tauri-apps/plugin-process";

// Get the main window
const mainWindow = getCurrentWindow();

// Set up close request handler to hide window instead of closing app
await mainWindow.onCloseRequested(async (event) => {
  console.log("🔄 Close requested - hiding window to system tray");
  event.preventDefault();
  await mainWindow.hide();
});

const menu = await Menu.new({
  items: [
    {
      id: "show",
      text: "Show Voice Gecko",
      action: async () => {
        console.log("🔄 Showing application from system tray");
        await showAndFocusWindow();
      },
    },
    {
      id: "hide",
      text: "Hide to Tray",
      action: async () => {
        console.log("🔄 Hiding application to system tray");
        await mainWindow.hide();
      },
    },
    {
      id: "close",
      text: "Quit Voice Gecko",
      action: () => {
        console.log("🔄 Closing application via system tray");
        void exit(0);
      },
    },
  ],
});

// Helper function to properly show and focus the window
async function showAndFocusWindow() {
  await mainWindow.show();
  await mainWindow.unminimize(); // In case it was minimized
  await mainWindow.setFocus();
}

export const tray = await TrayIcon.new({
  icon: (await defaultWindowIcon()) ?? "",
  menu,
  showMenuOnLeftClick: false,
  action: async (event) => {
    switch (event.type) {
      case "DoubleClick":
        // Double-click: always show and focus window
        if (event.button === "Left") {
          console.log("🔄 Double-clicked tray icon - showing window");
          await showAndFocusWindow();
        }
        break;
      case "Click":
        break;

      default:
        // Right-click shows context menu (handled automatically by Tauri)
        break;
    }
  },
});

console.log("🖥️ System tray created successfully");
