import { useEffect, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';
import { Choreographer } from '@/entities/DanceGroup';

export const useGroupReferenceLists = () => {
    const [styles, setStyles] = useState<string[]>([]);
    const [choreographers, setChoreographers] = useState<Choreographer[]>([]);

    useEffect(() => {
        $apiPrivate.get<string[]>('/schedule/styles').then((r) => setStyles(r.data));
        $apiPrivate.get<Choreographer[]>('/schedule/choreographers').then((r) => setChoreographers(r.data));
    }, []);

    return { styles, choreographers };
};
