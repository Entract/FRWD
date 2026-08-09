import type { Operation } from "@frwd/operations";
/**
 * The properties panel for the selected object.
 *
 * It is meant to feel like adjusting *this object* rather than editing CSS
 * source. The user thinks "make this card roomier"; the editor turns that into
 * a deterministic declaration and sends it through an operation.
 *
 * Two rules hold the design together:
 *
 * - **Computed style is evidence, never state.** `getComputedStyle` tells us
 *   what the browser actually rendered, which is the only honest way to show a
 *   value that came from a stylesheet rule. It is read-only. The document's
 *   own DOM and CSS remain the truth.
 * - **Selecting is not editing.** Nothing is written until the user changes
 *   something, so opening the panel on an object never copies computed values
 *   into it.
 */
export interface InspectorTarget {
    id: string;
    /** The projected element, for computed values only. */
    element: HTMLElement;
    /** Declarations actually present on the canonical element. */
    overrides: Record<string, string>;
    classes: string[];
    tagName: string;
    parentLabel: string | null;
}
export interface InspectorHandlers {
    setProperty(property: string, value: string): void;
    clearProperty(property: string): void;
    setClasses(classes: string[]): void;
}
export declare function renderInspector(panel: HTMLElement, target: InspectorTarget | null, handlers: InspectorHandlers, readOnly: boolean): void;
/** Class changes compile to the existing attribute operation. */
export declare function classOperation(id: string, classes: string[]): Operation;
//# sourceMappingURL=inspector.d.ts.map