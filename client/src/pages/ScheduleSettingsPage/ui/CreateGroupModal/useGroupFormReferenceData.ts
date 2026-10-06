import { useEffect, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';
import { Choreographer, Branch } from '@/entities/DanceGroup';

export const useGroupFormReferenceData = (isOpen: boolean) => {
    const [choreographers, setChoreographers] = useState<Choreographer[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [styles, setStyles] = useState<string[]>([]);

    useEffect(() => {
        if (!isOpen) return;
        Promise.all([
            $apiPrivate.get<Choreographer[]>('/schedule/choreographers'),
            $apiPrivate.get<Branch[]>('/company/branches'),
            $apiPrivate.get<string[]>('/schedule/styles'),
        ]).then(([c, b, st]) => {
            setChoreographers(c.data);
            setBranches(b.data);
            setStyles(st.data);
        });
    }, [isOpen]);

    return { choreographers, branches, styles };
};
