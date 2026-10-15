const PERCENT = 100;

// Width of a bar as a share of the largest value shown next to it.
export const share = (value: number, largest: number): string =>
    `${largest > 0 ? Math.max(0, (value / largest) * PERCENT) : 0}%`;
