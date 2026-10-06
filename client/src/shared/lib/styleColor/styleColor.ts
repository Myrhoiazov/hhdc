export const STYLE_COLOR_SLOTS = 8;

/**
 * Deterministic hash so the same style/direction name always maps to the same
 * slot in the --style-N-{bg,text}-redesigned palette (default.scss/dark.scss).
 */
export function getStyleColorSlot(name: string): number {
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) {
        hash = (hash * 31 + name.charCodeAt(i)) | 0;
    }
    return (Math.abs(hash) % STYLE_COLOR_SLOTS) + 1;
}
