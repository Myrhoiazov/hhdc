import { MollieSubscription } from '@/entities/MollieSubscription';

type ModalKind = 'cancel' | 'edit' | 'restart';

export const buildDropdownItems = (
    status: MollieSubscription['status'],
    openModal: (modal: ModalKind) => void,
) => {
    if (status === 'active') {
        return [
            { content: 'Изменить подписку', onClick: () => openModal('edit') },
        ];
    }
    if (['canceled', 'completed'].includes(status ?? '')) {
        return [{ content: 'Запустить снова', onClick: () => openModal('restart') }];
    }
    return [];
};
