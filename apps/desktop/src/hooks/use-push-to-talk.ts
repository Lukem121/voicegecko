import { useEffect } from "react";

import { shortcutActions } from "~/lib/shortcuts/actions";
import { useShortcutStore } from "~/lib/stores/shortcut-store";

export function usePushToTalk() {
  const { categories } = useShortcutStore();

  useEffect(() => {
    const pushToTalkShortcut = categories
      .flatMap((c) => c.shortcuts)
      .find((s) => s.id === "push-to-talk");

    if (!pushToTalkShortcut?.enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const keys = pushToTalkShortcut.keys.map((k) => k.toLowerCase());
      const pressed = new Set<string>();

      if (event.metaKey) pressed.add("command");
      if (event.ctrlKey) pressed.add("control");
      if (event.altKey) pressed.add("alt");
      if (event.shiftKey) pressed.add("shift");
      if (
        !["control", "alt", "shift", "meta"].includes(event.key.toLowerCase())
      ) {
        pressed.add(event.key.toLowerCase());
      }

      const allKeysPressed = keys.every((key) =>
        pressed.has(key.toLowerCase()),
      );

      if (allKeysPressed && pressed.size === keys.length) {
        void shortcutActions["push-to-talk"].onPress();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const keys = pushToTalkShortcut.keys.map((k) => k.toLowerCase());
      const key = event.key.toLowerCase();

      const modifierKeys = ["command", "control", "alt", "shift", "meta"];
      let relevantKey = "";
      if (key === "meta") relevantKey = "command";
      else if (modifierKeys.includes(key)) relevantKey = key;
      else relevantKey = key;

      if (keys.includes(relevantKey)) {
        void shortcutActions["push-to-talk"].onRelease();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [categories]);
}
