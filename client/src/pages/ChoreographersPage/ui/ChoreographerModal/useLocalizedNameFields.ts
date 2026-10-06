import { useEffect, useState } from 'react';
import { Choreographer } from '../ChoreographerCard/ChoreographerCard';

export type Lang = 'RU' | 'UA' | 'EN';
export const LANGS: Lang[] = ['RU', 'UA', 'EN'];

// Manages the RU/UA/EN name pairs and which one is currently shown in the
// form. A lookup table (rather than a chain of `lang === 'RU' ? ... : ...`
// ternaries) keeps switching languages a single property access, not branching.
export const useLocalizedNameFields = (isOpen: boolean, editChoreographer?: Choreographer | null) => {
    const [lang, setLang] = useState<Lang>('RU');
    const [firstNameRu, setFirstNameRu] = useState('');
    const [lastNameRu, setLastNameRu] = useState('');
    const [firstNameUa, setFirstNameUa] = useState('');
    const [lastNameUa, setLastNameUa] = useState('');
    const [firstNameEn, setFirstNameEn] = useState('');
    const [lastNameEn, setLastNameEn] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setLang('RU');
        setFirstNameRu(editChoreographer?.firstName ?? '');
        setLastNameRu(editChoreographer?.lastName ?? '');
        setFirstNameUa(editChoreographer?.firstNameUa ?? '');
        setLastNameUa(editChoreographer?.lastNameUa ?? '');
        setFirstNameEn(editChoreographer?.firstNameEn ?? '');
        setLastNameEn(editChoreographer?.lastNameEn ?? '');
    }, [isOpen, editChoreographer]);

    const namesByLang: Record<Lang, {
        first: string; last: string; setFirst: (value: string) => void; setLast: (value: string) => void;
    }> = {
        RU: {
            first: firstNameRu, last: lastNameRu, setFirst: setFirstNameRu, setLast: setLastNameRu,
        },
        UA: {
            first: firstNameUa, last: lastNameUa, setFirst: setFirstNameUa, setLast: setLastNameUa,
        },
        EN: {
            first: firstNameEn, last: lastNameEn, setFirst: setFirstNameEn, setLast: setLastNameEn,
        },
    };
    const current = namesByLang[lang];

    return {
        lang, setLang,
        firstNameRu, lastNameRu, firstNameUa, lastNameUa, firstNameEn, lastNameEn,
        firstNameValue: current.first,
        lastNameValue: current.last,
        setFirstName: current.setFirst,
        setLastName: current.setLast,
    };
};
