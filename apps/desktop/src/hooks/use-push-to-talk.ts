import { useEffect, useRef } from "react";

import { shortcutActions } from "~/lib/shortcuts/actions";
import { useShortcutStore } from "~/lib/stores/shortcut-store";

export function usePushToTalk() {
  const { categories } = useShortcutStore();
  const isRecordingRef = useRef(false);

  useEffect(() => {
    const pushToTalkShortcut = categories
      .flatMap((c) => c.shortcuts)
      .find((s) => s.id === "push-to-talk");

    if (!pushToTalkShortcut?.enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent multiple keydown events while holding
      if (event.repeat) return;

      const normalizedKeys = pushToTalkShortcut.keys.map((k) => {
        const lower = k.toLowerCase();
        // Handle CommandOrControl based on platform
        if (lower === "commandorcontrol") {
          return navigator.platform.includes("Mac") ? "meta" : "control";
        }
        return lower;
      });

      const pressed = new Set<string>();
      if (event.metaKey) pressed.add("meta");
      if (event.ctrlKey) pressed.add("control");
      if (event.altKey) pressed.add("alt");
      if (event.shiftKey) pressed.add("shift");

      const eventKey = event.key.toLowerCase();
      if (!["control", "alt", "shift", "meta"].includes(eventKey)) {
        pressed.add(eventKey === " " ? "space" : eventKey);
      }

      const allKeysPressed = normalizedKeys.every((key) => pressed.has(key));

      if (
        allKeysPressed &&
        pressed.size === normalizedKeys.length &&
        !isRecordingRef.current
      ) {
        isRecordingRef.current = true;
        void shortcutActions["push-to-talk"].onPress();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!isRecordingRef.current) return;

      const normalizedKeys = pushToTalkShortcut.keys.map((k) => {
        const lower = k.toLowerCase();
        if (lower === "commandorcontrol") {
          return navigator.platform.includes("Mac") ? "meta" : "control";
        }
        return lower;
      });

      const eventKey = event.key.toLowerCase();
      let releasedKey = eventKey;

      if (eventKey === " ") releasedKey = "space";
      else if (eventKey === "meta") releasedKey = "meta";
      else if (eventKey === "control") releasedKey = "control";

      if (normalizedKeys.includes(releasedKey)) {
        isRecordingRef.current = false;
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
