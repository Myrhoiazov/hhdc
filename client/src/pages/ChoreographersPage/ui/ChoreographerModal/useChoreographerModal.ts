import { Choreographer, ChoreographerCategory } from '../ChoreographerCard/ChoreographerCard';
import { useLocalizedNameFields, Lang, LANGS } from './useLocalizedNameFields';
import { usePhotoUploads } from './usePhotoUploads';
import { useChoreographerFormFields } from './useChoreographerFormFields';
import { useChoreographerSubmit } from './useChoreographerSubmit';

export type { Lang };
export { LANGS };
export const CATEGORIES: ChoreographerCategory[] = ['START', 'FAN', 'PRO'];
export const CATEGORY_LABELS: Record<ChoreographerCategory, string> = { START: 'Start', FAN: 'Fan', PRO: 'Pro' };

declare const __API__: string;

export function toAbsUrl(url: string | null | undefined) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${__API__}${url}`;
}

interface UseChoreographerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    editChoreographer?: Choreographer | null;
}

export const useChoreographerModal = ({
    isOpen, onClose, onSaved, editChoreographer,
}: UseChoreographerModalProps) => {
    const names = useLocalizedNameFields(isOpen, editChoreographer);
    const photos = usePhotoUploads(isOpen, editChoreographer);
    const fields = useChoreographerFormFields(isOpen, editChoreographer);

    const { saving, onSubmit } = useChoreographerSubmit(
        {
            firstNameRu: names.firstNameRu, lastNameRu: names.lastNameRu,
            firstNameUa: names.firstNameUa, lastNameUa: names.lastNameUa,
            firstNameEn: names.firstNameEn, lastNameEn: names.lastNameEn,
            phone: fields.phone, email: fields.email, birthday: fields.birthday, experience: fields.experience,
            category: fields.category,
            photo: photos.photo, mainPhoto: photos.mainPhoto, additionalPhotos: photos.additionalPhotos,
            description: fields.description, templateDescription: fields.templateDescription,
            showOnSite: fields.showOnSite,
        },
        editChoreographer,
        onSaved,
        onClose,
    );

    return {
        editChoreographer,
        saving,
        ...names,
        ...photos,
        ...fields,
        onSubmit,
    };
};
