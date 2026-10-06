import { ChangeEvent, useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { emptyUploadForm, extractApiErrorMessage, KnowledgeUploadForm } from './knowledgeBaseTypes';

export const useKnowledgeIngestion = (load: () => Promise<void>) => {
    const [uploadForm, setUploadForm] = useState<KnowledgeUploadForm>(emptyUploadForm());
    const [crawlUrl, setCrawlUrl] = useState('');
    const [busy, setBusy] = useState(false);

    const uploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setBusy(true);
        try {
            const form = new FormData();
            form.append('file', file);
            form.append('category', uploadForm.category);
            form.append('priority', String(uploadForm.priority));
            form.append('tags', uploadForm.tags);
            await $apiPrivate.post('/knowledge/documents/upload', form);
            toast.success('Файл загружен, ожидает эмбеддинга');
            await load();
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'Не удалось загрузить файл'));
        } finally {
            setBusy(false);
            event.target.value = '';
        }
    };

    const crawl = async () => {
        if (!crawlUrl.trim()) return toast.error('Укажите ссылку');
        setBusy(true);
        try {
            await $apiPrivate.post('/knowledge/documents/crawl', {
                url: crawlUrl.trim(), category: uploadForm.category, priority: uploadForm.priority, tags: uploadForm.tags,
            });
            toast.success('Страница собрана, ожидает эмбеддинга');
            setCrawlUrl('');
            await load();
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'Не удалось собрать страницу по ссылке'));
        } finally {
            setBusy(false);
        }
    };

    return { uploadForm, setUploadForm, crawlUrl, setCrawlUrl, busy, uploadFile, crawl };
};
