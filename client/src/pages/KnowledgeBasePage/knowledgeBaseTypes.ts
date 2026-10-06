import axios from 'axios';

export type KnowledgeCategory =
    | 'BRAND' | 'LOCATIONS' | 'DANCE_STYLES' | 'CLASSES' | 'SCHEDULE'
    | 'REGISTRATION' | 'FAQ' | 'CAMP' | 'BUSINESS_RULES' | 'SOURCES' | 'OTHER';

export type KnowledgeDocumentStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'ERROR';

export interface KnowledgeDocument {
    id: string;
    title: string | null;
    sourceType: string;
    sourceUrl: string;
    status: KnowledgeDocumentStatus;
    category: KnowledgeCategory;
    priority: number;
    tags: string[];
    chunkCount: number;
    errorMessage: string | null;
    lastSyncedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
    'BRAND', 'LOCATIONS', 'DANCE_STYLES', 'CLASSES', 'SCHEDULE',
    'REGISTRATION', 'FAQ', 'CAMP', 'BUSINESS_RULES', 'SOURCES', 'OTHER',
];

export const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
    BRAND: 'Бренд',
    LOCATIONS: 'Локации',
    DANCE_STYLES: 'Стили танца',
    CLASSES: 'Занятия',
    SCHEDULE: 'Расписание',
    REGISTRATION: 'Регистрация',
    FAQ: 'FAQ',
    CAMP: 'Лагерь',
    BUSINESS_RULES: 'Правила',
    SOURCES: 'Источники',
    OTHER: 'Другое',
};

export const STATUS_LABELS: Record<KnowledgeDocumentStatus, string> = {
    PENDING: 'Ожидает эмбеддинга',
    ACTIVE: 'Активен',
    INACTIVE: 'Неактивен',
    ERROR: 'Ошибка',
};

export interface KnowledgeUploadForm {
    category: KnowledgeCategory;
    priority: number;
    tags: string;
}

export const emptyUploadForm = (): KnowledgeUploadForm => ({ category: 'OTHER', priority: 0, tags: '' });

export const extractApiErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError<{ message?: string }>(error)) {
        const message = error.response?.data?.message;
        if (typeof message === 'string' && message.length > 0) return message;
    }
    if (error instanceof Error && error.message) return error.message;
    return fallback;
};
