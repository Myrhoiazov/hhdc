import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Choreographer, GroupLevel, Branch } from '@/entities/DanceGroup';
import { SelectField, NumberField, LevelButtons } from './FormField';
import s from './CreateGroupModal.module.scss';

const LEVELS: { value: GroupLevel; label: string }[] = [
    { value: 'START', label: 'Start' },
    { value: 'FAN', label: 'Fan' },
    { value: 'PRO', label: 'Pro' },
];

interface CreateGroupModalFieldsProps {
    name: string;
    setName: (value: string) => void;
    choreographerId: string;
    setChoreographerId: (value: string) => void;
    choreographers: Choreographer[];
    style: string;
    setStyle: (value: string) => void;
    styles: string[];
    branchId: string;
    setBranchId: (value: string) => void;
    branches: Branch[];
    level: GroupLevel;
    setLevel: (level: GroupLevel) => void;
    maxParticipants: number;
    setMaxParticipants: (value: number) => void;
    lessonPrice: string;
    setLessonPrice: (value: string) => void;
}

type NameFieldProps = Pick<CreateGroupModalFieldsProps, 'name' | 'setName'>;

const NameField = memo(function NameField({ name, setName }: NameFieldProps) {
    const { t } = useTranslation();

    return (
        <div className={s.field}>
            <label className={s.label}>
                {t('Название группы')} <span className={s.req}>*</span>
            </label>
            <input
                className={s.input}
                placeholder="Break dance 6-10 років"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
        </div>
    );
});

type ReferenceSelectsProps = Pick<
    CreateGroupModalFieldsProps,
    | 'choreographerId'
    | 'setChoreographerId'
    | 'choreographers'
    | 'style'
    | 'setStyle'
    | 'styles'
    | 'branchId'
    | 'setBranchId'
    | 'branches'
>;

const ReferenceSelects = memo(function ReferenceSelects(props: ReferenceSelectsProps) {
    return (
        <>
            <SelectField
                label="Хореограф"
                required
                value={props.choreographerId}
                onChange={props.setChoreographerId}
                placeholder="Выберите хореографа"
            >
                {props.choreographers.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}
                    </option>
                ))}
            </SelectField>

            <SelectField
                label="Стиль"
                required
                value={props.style}
                onChange={props.setStyle}
                placeholder="Выберите стиль"
            >
                {props.styles.map((styleName) => (
                    <option key={styleName} value={styleName}>
                        {styleName}
                    </option>
                ))}
            </SelectField>

            <SelectField
                label="Филиал"
                required
                value={props.branchId}
                onChange={props.setBranchId}
                placeholder="Выберите филиал"
            >
                {props.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                        {b.name}
                        {b.city ? ` · ${b.city}` : ''}
                    </option>
                ))}
            </SelectField>
        </>
    );
});

type LevelAndPricingRowProps = Pick<
    CreateGroupModalFieldsProps,
    'level' | 'setLevel' | 'maxParticipants' | 'setMaxParticipants' | 'lessonPrice' | 'setLessonPrice'
>;

const LevelAndPricingRow = memo(function LevelAndPricingRow(props: LevelAndPricingRowProps) {
    const { t } = useTranslation();
    const { setMaxParticipants } = props;
    const handleMaxParticipantsChange = useCallback(
        (value: string) => setMaxParticipants(Number(value)),
        [setMaxParticipants],
    );

    return (
        <div className={s.row}>
            <div className={s.field}>
                <label className={s.label}>
                    {t('Уровень группы')} <span className={s.req}>*</span>
                </label>
                <LevelButtons levels={LEVELS} level={props.level} setLevel={props.setLevel} />
            </div>
            <NumberField
                label="Макс. участников"
                value={props.maxParticipants}
                min={1}
                onChange={handleMaxParticipantsChange}
            />
            <NumberField
                label="Стоимость занятия, EUR"
                value={props.lessonPrice}
                min={0}
                step="0.01"
                onChange={props.setLessonPrice}
            />
        </div>
    );
});

export const CreateGroupModalFields = memo(function CreateGroupModalFields(
    props: CreateGroupModalFieldsProps,
) {
    return (
        <>
            <NameField name={props.name} setName={props.setName} />
            <ReferenceSelects
                choreographerId={props.choreographerId}
                setChoreographerId={props.setChoreographerId}
                choreographers={props.choreographers}
                style={props.style}
                setStyle={props.setStyle}
                styles={props.styles}
                branchId={props.branchId}
                setBranchId={props.setBranchId}
                branches={props.branches}
            />
            <LevelAndPricingRow
                level={props.level}
                setLevel={props.setLevel}
                maxParticipants={props.maxParticipants}
                setMaxParticipants={props.setMaxParticipants}
                lessonPrice={props.lessonPrice}
                setLessonPrice={props.setLessonPrice}
            />
        </>
    );
});
