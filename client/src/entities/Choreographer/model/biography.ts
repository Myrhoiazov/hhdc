export const BIO_KINDS = ['SHORT', 'FULL', 'PROMO'] as const;

export type BioKind = (typeof BIO_KINDS)[number];

export interface BioVersion {
    id: string;
    locale: string;
    kind: BioKind;
    content: string;
    version: number;
    isCurrent: boolean;
    createdAt: string;
}
