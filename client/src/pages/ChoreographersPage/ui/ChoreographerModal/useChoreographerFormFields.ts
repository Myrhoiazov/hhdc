import { useEffect, useState } from 'react';
import { Choreographer, ChoreographerCategory } from '../ChoreographerCard/ChoreographerCard';

export const useChoreographerFormFields = (isOpen: boolean, editChoreographer?: Choreographer | null) => {
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [birthday, setBirthday] = useState('');
    const [experience, setExperience] = useState('');
    const [category, setCategory] = useState<ChoreographerCategory | ''>('');
    const [showOnSite, setShowOnSite] = useState(true);
    const [description, setDescription] = useState('');
    const [templateDescription, setTemplateDescription] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setPhone(editChoreographer?.phone ?? '');
        setEmail(editChoreographer?.email ?? '');
        setBirthday(editChoreographer?.birthday ?? '');
        setExperience(editChoreographer?.experience != null ? String(editChoreographer.experience) : '');
        setCategory(editChoreographer?.category ?? '');
        setShowOnSite(editChoreographer?.showOnSite ?? true);
        setDescription(editChoreographer?.description ?? '');
        setTemplateDescription(editChoreographer?.templateDescription ?? '');
    }, [isOpen, editChoreographer]);

    return {
        phone, setPhone,
        email, setEmail,
        birthday, setBirthday,
        experience, setExperience,
        category, setCategory,
        showOnSite, setShowOnSite,
        description, setDescription,
        templateDescription, setTemplateDescription,
    };
};
