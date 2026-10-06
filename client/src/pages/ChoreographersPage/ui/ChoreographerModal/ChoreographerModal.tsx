import { memo } from 'react';
import { Modal } from '@/shared/ui/Modal/Modal';
import { Choreographer } from '../ChoreographerCard/ChoreographerCard';
import s from './ChoreographerModal.module.scss';
import { useChoreographerModal } from './useChoreographerModal';
import { ChoreographerPhotoSection } from './ChoreographerPhotoSection';
import { ChoreographerDetailsForm } from './ChoreographerDetailsForm';

interface ChoreographerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    editChoreographer?: Choreographer | null;
}

export const ChoreographerModal = memo(({ isOpen, onClose, onSaved, editChoreographer }: ChoreographerModalProps) => {
    const {
        saving, lang, setLang, firstNameValue, lastNameValue, setFirstName, setLastName, photo,
        mainPhoto, setMainPhoto, additionalPhotos, removeExtra,
        uploadingPhoto, uploadingMain, uploadingExtra, avatarInputRef, mainInputRef, extraInputRef,
        onAvatarChange, onMainChange, onExtraChange, phone, setPhone, birthday, setBirthday, email, setEmail,
        experience, setExperience, category, setCategory, showOnSite, setShowOnSite,
        description, setDescription, templateDescription, setTemplateDescription,
        firstNameRu, lastNameRu, onSubmit,
    } = useChoreographerModal({ isOpen, onClose, onSaved, editChoreographer });

    return (
        <Modal isOpen={isOpen} onClose={onClose} lazy>
            <div className={s.modal}>
                <h2 className={s.title}>
                    {editChoreographer ? 'РЕДАКТИРОВАТЬ ХОРЕОГРАФА' : 'СОЗДАТЬ ХОРЕОГРАФА'}
                </h2>

                <ChoreographerPhotoSection
                    photo={photo} mainPhoto={mainPhoto} additionalPhotos={additionalPhotos}
                    uploadingPhoto={uploadingPhoto} uploadingMain={uploadingMain} uploadingExtra={uploadingExtra}
                    firstNameRu={firstNameRu} lastNameRu={lastNameRu}
                    avatarInputRef={avatarInputRef} mainInputRef={mainInputRef} extraInputRef={extraInputRef}
                    onAvatarChange={onAvatarChange} onMainChange={onMainChange} onExtraChange={onExtraChange}
                    onRemoveMain={() => setMainPhoto(null)} onRemoveExtra={removeExtra}
                />

                <ChoreographerDetailsForm
                    lang={lang} setLang={setLang}
                    firstNameValue={firstNameValue} lastNameValue={lastNameValue}
                    setFirstName={setFirstName} setLastName={setLastName}
                    phone={phone} setPhone={setPhone} birthday={birthday} setBirthday={setBirthday}
                    email={email} setEmail={setEmail}
                    experience={experience} setExperience={setExperience}
                    category={category} setCategory={setCategory}
                    showOnSite={showOnSite} setShowOnSite={setShowOnSite}
                    description={description} setDescription={setDescription}
                    templateDescription={templateDescription} setTemplateDescription={setTemplateDescription}
                />

                <button className={s.submitBtn} onClick={onSubmit} disabled={saving}>
                    {saving ? 'Сохранение...' : editChoreographer ? 'Сохранить' : 'Создать'}
                </button>
            </div>
        </Modal>
    );
});
