import { ChoreographerProfileInput, RelationshipStatus } from '@/entities/Choreographer';
import { formText } from '@/shared/lib/form/formText';

const toList = (value: FormDataEntryValue | null) =>
    String(value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

export const readProfileForm = (form: FormData): ChoreographerProfileInput => ({
    stageName: formText(form, 'stageName'),
    relationshipStatus: formText(form, 'relationshipStatus') as RelationshipStatus,
    countryCode: formText(form, 'countryCode'),
    city: formText(form, 'city'),
    timezone: formText(form, 'timezone'),
    styles: toList(form.get('styles')),
    languages: toList(form.get('languages')),
    bioShort: formText(form, 'bioShort'),
    bioFull: formText(form, 'bioFull'),
    instagramUrl: formText(form, 'instagramUrl'),
    tiktokUrl: formText(form, 'tiktokUrl'),
    youtubeUrl: formText(form, 'youtubeUrl'),
    websiteUrl: formText(form, 'websiteUrl'),
});
