import { useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { extractApiErrorMessage } from './knowledgeBaseTypes';

export const useKnowledgeDocumentActions = (load: () => Promise<void>) => {
    const [embeddingId, setEmbeddingId] = useState<string | null>(null);
    const [embeddingAll, setEmbeddingAll] = useState(false);

    const embed = async (id: string) => {
        setEmbeddingId(id);
        try {
            await $apiPrivate.post(`/knowledge/documents/${encodeURIComponent(id)}/embed`);
            toast.success('Эмбеддинг запущен');
            await load();
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'Не удалось запустить эмбеддинг'));
        } finally {
            setEmbeddingId(null);
        }
    };

    const embedAllPending = async () => {
        setEmbeddingAll(true);
        try {
            await $apiPrivate.post('/knowledge/documents/embed');
            toast.success('Эмбеддинг запущен для всех документов в ожидании');
            await load();
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'Не удалось запустить эмбеддинг'));
        } finally {
            setEmbeddingAll(false);
        }
    };

    const remove = async (id: string) => {
        if (!window.confirm('Удалить документ из базы знаний?')) return;
        try {
            await $apiPrivate.delete(`/knowledge/documents/${encodeURIComponent(id)}`);
            toast.success('Документ удалён');
            await load();
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'Не удалось удалить документ'));
        }
    };

    return { embeddingId, embeddingAll, embed, embedAllPending, remove };
};
