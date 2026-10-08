import { ChoreographerRelationshipStatus } from '@prisma/client';
import { z } from 'zod';

const MAX_LIST_ITEMS = 20;

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional().transform(value => (value === '' ? null : value));

// Links are shown as clickable anchors, so only web addresses are accepted.
const webUrl = z.string().trim().max(500).url().refine(value => /^https?:\/\//i.test(value), 'Only http(s) links are allowed')
    .nullable().optional().or(z.literal('').transform((): null => null));

// Styles and languages are short labels; normalising them keeps "Heels" and " heels " one value.
export const normalizeLabels = (values: string[]): string[] => Array.from(new Set(values.map(value => value.trim().toLowerCase().replace(/\s+/g, ' ')).filter(Boolean))).slice(0, MAX_LIST_ITEMS);

const labels = z.array(z.string().max(60)).max(50).optional().transform(values => (values ? normalizeLabels(values) : undefined));

const profileFields = {
    stageName: optionalText(200),
    bioShort: optionalText(600),
    bioFull: optionalText(20000),
    countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, 'Use a two-letter country code').nullable().optional().or(z.literal('').transform((): null => null)),
    city: optionalText(120),
    timezone: optionalText(64),
    relationshipStatus: z.nativeEnum(ChoreographerRelationshipStatus).optional(),
    websiteUrl: webUrl,
    instagramUrl: webUrl,
    tiktokUrl: webUrl,
    youtubeUrl: webUrl,
    styles: labels,
    languages: labels,
};

export const updateChoreographerSchema = z.object(profileFields).strict();
export const createChoreographerSchema = z.object({ personId: z.string().uuid(), ...profileFields }).strict();
export type ChoreographerProfileInput = z.infer<typeof updateChoreographerSchema>;

export const listChoreographersSchema = z.object({
    q: z.string().trim().min(1).max(200).optional(),
    relationshipStatus: z.nativeEnum(ChoreographerRelationshipStatus).optional(),
});
