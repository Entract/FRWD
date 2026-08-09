import type { Page } from "@playwright/test";

/**
 * The editor's dev-only introspection hook.
 *
 * Declared once here rather than in each spec: four copies drifted apart the
 * moment the hook gained a field, and the compiler was right to complain.
 */
export interface EditorHook {
  source: () => string | null;
  readOnly: () => boolean | null;
  diagnostics: () => string[];
  view: () => string;
  lastPrintSource: () => string | null;
}

declare global {
  interface Window {
    __frwdEditor: EditorHook;
  }
}

export const source = (page: Page): Promise<string> =>
  page.evaluate(() => window.__frwdEditor.source() ?? "");
