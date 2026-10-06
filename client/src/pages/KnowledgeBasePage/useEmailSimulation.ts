import { useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { emptySimulationForm, EmailSimulationForm, EmailSimulationResult } from './emailSimulationTypes';
import { extractApiErrorMessage } from './knowledgeBaseTypes';

export const useEmailSimulation = (onCompleted?: () => void) => {
    const [form, setForm] = useState<EmailSimulationForm>(emptySimulationForm());
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<EmailSimulationResult | null>(null);

    const run = async () => {
        if (!form.subject.trim() || !form.body.trim()) return toast.error('Укажите тему и текст письма');
        setRunning(true);
        setResult(null);
        try {
            const response = await $apiPrivate.post<EmailSimulationResult>('/ai-email/simulate', {
                from: form.from.trim() || undefined,
                subject: form.subject,
                body: form.body,
                topK: form.topK.trim() ? Number(form.topK) : undefined,
                noKnowledge: form.noKnowledge,
                forceDraft: form.forceDraft,
                classificationPromptId: form.classificationPromptId ? Number(form.classificationPromptId) : undefined,
                draftBodyPromptId: form.draftBodyPromptId ? Number(form.draftBodyPromptId) : undefined,
                noQueryExpansion: form.noQueryExpansion,
                noRerank: form.noRerank,
            });
            setResult(response.data);
            onCompleted?.();
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'Не удалось выполнить симуляцию'));
        } finally {
            setRunning(false);
        }
    };

    return { form, setForm, running, result, run };
};
