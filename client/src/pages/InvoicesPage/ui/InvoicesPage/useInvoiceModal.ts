import { useState } from 'react';
import { Invoice } from '../../model/types';

export const useInvoiceModal = () => {
    const [modalOpen, setModalOpen] = useState(false);
    const [paidMode, setPaidMode] = useState(false);
    const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);

    const closeModal = () => {
        setModalOpen(false);
        setEditInvoice(null);
        setPaidMode(false);
    };

    const openCreateModal = (nextPaidMode: boolean) => {
        setPaidMode(nextPaidMode);
        setModalOpen(true);
    };

    const openEditModal = (invoice: Invoice) => {
        setEditInvoice(invoice);
        setModalOpen(true);
    };

    return {
        modalOpen, paidMode, editInvoice, closeModal, openCreateModal, openEditModal,
    };
};
