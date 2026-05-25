import { Extension } from "@tiptap/core";

export interface ShortcutOptions {
  onTrigger: () => void;
}

export const KeyboardTriggerExtension = Extension.create<ShortcutOptions>({
  name: "keyboardTrigger",

  addOptions() {
    return {
      onTrigger: () => {},
    };
  },

  addKeyboardShortcuts() {
    return {
      // Maps Cmd+Enter (Mac) and Ctrl+Enter (Windows) automatically
      "Mod-Enter": () => {
        this.options.onTrigger();
        return true; // Returning true blocks the browser from inserting a normal line break
      },
    };
  },
});
