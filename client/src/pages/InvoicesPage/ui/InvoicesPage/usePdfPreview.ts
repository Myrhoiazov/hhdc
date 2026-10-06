import { useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { Invoice } from '../../model/types';

const loadPdf = async (invoice: Invoice) => {
    const response = await $apiPrivate.get(`/invoices/${invoice.id}/pdf`, { responseType: 'blob' });
    return URL.createObjectURL(response.data);
};

export const usePdfPreview = () => {
    const [previewUrl, setPreviewUrl] = useState('');
    const [previewNumber, setPreviewNumber] = useState('');

    const previewPdf = async (invoice: Invoice) => {
        try {
            const url = await loadPdf(invoice);
            setPreviewUrl(url);
            setPreviewNumber(invoice.number);
        } catch {
            toast.error('Не удалось открыть PDF');
        }
    };

    const downloadPdf = async (invoice: Invoice) => {
        try {
            const url = await loadPdf(invoice);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${invoice.number}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Не удалось скачать PDF');
        }
    };

    const closePreview = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
        setPreviewNumber('');
    };

    return { previewUrl, previewNumber, previewPdf, downloadPdf, closePreview };
};
