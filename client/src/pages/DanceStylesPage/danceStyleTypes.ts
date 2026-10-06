export interface DanceStyle {
    id: number;
    name: string;
    nameUa?: string;
    nameEn?: string;
    description?: string;
    descriptionUa?: string;
    descriptionEn?: string;
    content?: string;
    contentUa?: string;
    contentEn?: string;
    image?: string;
    youtubeUrl?: string;
    isActive: boolean;
}

export type Lang = 'ru' | 'ua' | 'en';
export type StyleForm = Omit<DanceStyle, 'id'>;

export const emptyForm: StyleForm = {
    name: '',
    nameUa: '',
    nameEn: '',
    description: '',
    descriptionUa: '',
    descriptionEn: '',
    content: '',
    contentUa: '',
    contentEn: '',
    image: '',
    youtubeUrl: '',
    isActive: true,
};

export const langFields = {
    ru: { name: 'name', description: 'description', content: 'content', label: 'RU' },
    ua: { name: 'nameUa', description: 'descriptionUa', content: 'contentUa', label: 'UA' },
    en: { name: 'nameEn', description: 'descriptionEn', content: 'contentEn', label: 'EN' },
} as const;
