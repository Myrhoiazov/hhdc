import { useEffect, useState } from 'react';
import type { DanceGroup } from '@/entities/DanceGroup';
import { GroupLevel, ScheduleSlot } from '@/entities/DanceGroup';
import { emptySlot } from './groupFormSlots';

export const useGroupFormState = (isOpen: boolean, editGroup: DanceGroup | null | undefined) => {
    const [name, setName] = useState('');
    const [style, setStyle] = useState('');
    const [level, setLevel] = useState<GroupLevel>('START');
    const [maxParticipants, setMaxParticipants] = useState(20);
    const [lessonPrice, setLessonPrice] = useState('0.00');
    const [choreographerId, setChoreographerId] = useState('');
    const [branchId, setBranchId] = useState('');
    const [slots, setSlots] = useState<ScheduleSlot[]>([emptySlot()]);

    useEffect(() => {
        if (editGroup) {
            setName(editGroup.name);
            setStyle(editGroup.style);
            setLevel(editGroup.level);
            setMaxParticipants(editGroup.maxParticipants);
            setLessonPrice(((editGroup.lessonPriceCents ?? 0) / 100).toFixed(2));
            setChoreographerId(String(editGroup.choreographerId));
            setBranchId(editGroup.branchId ? String(editGroup.branchId) : '');
            setSlots(editGroup.slots.length ? editGroup.slots : [emptySlot()]);
        } else {
            setName('');
            setStyle('');
            setLevel('START');
            setMaxParticipants(20);
            setLessonPrice('0.00');
            setChoreographerId('');
            setBranchId('');
            setSlots([emptySlot()]);
        }
    }, [editGroup, isOpen]);

    const addSlot = () => setSlots((prev) => [...prev, emptySlot()]);
    const updateSlot = (idx: number, field: keyof ScheduleSlot, value: string) => {
        setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
    };
    const removeSlot = (idx: number) => setSlots((prev) => prev.filter((_, i) => i !== idx));

    return {
        name, setName,
        style, setStyle,
        level, setLevel,
        maxParticipants, setMaxParticipants,
        lessonPrice, setLessonPrice,
        choreographerId, setChoreographerId,
        branchId, setBranchId,
        slots, addSlot, updateSlot, removeSlot,
    };
};
