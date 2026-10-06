import { memo, type ReactNode } from 'react';
import { Client, ClientLanguage, CLIENT_LANGUAGE_OPTIONS } from '@/entities/Client';
import { Input } from '@/shared/ui/Input/Input';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import { Text } from '@/shared/ui/Text/Text';
import { DanceGroup } from './useEditClientModal';
import s from './EditClientModal.module.scss';

interface EditClientFormFieldsProps {
    form: Client;
    errors: Record<string, string>;
    branchOptions: SelectOption<string>[];
    availableGroups: DanceGroup[];
    selectedGroupIds: number[];
    updateField: (field: keyof Client) => (value?: string) => void;
    updateBranch: (value?: string) => void;
    toggleGroup: (groupId: number) => void;
    onChangeImage: (value: File | File[]) => void;
}

const FieldWithError = ({ error, children }: { error?: string; children: ReactNode }) => (
    <div className={s.field}>
        {children}
        {error && <span className={s.fieldError}>{error}</span>}
    </div>
);

const ClientInfoFields = ({
    form, errors, branchOptions, updateField, updateBranch, onChangeImage,
}: {
    form: Client;
    errors: Record<string, string>;
    branchOptions: SelectOption<string>[];
    updateField: (field: keyof Client) => (value?: string) => void;
    updateBranch: (value?: string) => void;
    onChangeImage: (value: File | File[]) => void;
}) => (
    <div className={s.grid}>
        <FieldWithError error={errors.firstName}>
            <Input fullWidth label="Имя" type="text" value={form.firstName ?? ''} onChange={updateField('firstName')} />
        </FieldWithError>
        <FieldWithError error={errors.lastName}>
            <Input fullWidth label="Фамилия" type="text" value={form.lastName ?? ''} onChange={updateField('lastName')} />
        </FieldWithError>
        <FieldWithError error={errors.birthday}>
            <Input fullWidth label="Дата рождения" type="date" value={form.birthday ?? ''} onChange={updateField('birthday')} />
        </FieldWithError>
        <FieldWithError error={errors.phoneNumber}>
            <Input fullWidth label="Телефон" type="tel" value={form.phoneNumber ?? ''} onChange={updateField('phoneNumber')} />
        </FieldWithError>
        <FieldWithError error={errors.email}>
            <Input fullWidth label="E-mail" type="email" value={form.email ?? ''} onChange={updateField('email')} />
        </FieldWithError>
        <FieldWithError error={errors.social}>
            <Input fullWidth label="Социальные сети" type="text" value={form.social ?? ''} onChange={updateField('social')} />
        </FieldWithError>
        <FieldWithError error={errors.branchId}>
            <Select label="Филиал" options={branchOptions} value={form.branchId ? String(form.branchId) : ''} onChange={updateBranch} />
        </FieldWithError>
        <FieldWithError error={errors.preferredLanguage}>
            <Select<ClientLanguage>
                label="Язык клиента"
                options={CLIENT_LANGUAGE_OPTIONS}
                value={form.preferredLanguage ?? 'RU'}
                onChange={updateField('preferredLanguage')}
            />
        </FieldWithError>
        <FieldWithError error={errors.image}>
            <Input fullWidth label="Фото ученика" type="file" onChange={onChangeImage} />
        </FieldWithError>
    </div>
);

const BranchGroupsPicker = ({
    availableGroups, selectedGroupIds, toggleGroup,
}: {
    availableGroups: DanceGroup[];
    selectedGroupIds: number[];
    toggleGroup: (groupId: number) => void;
}) => (
    <div className={s.groupSection}>
        <Text size="s" title="Группы филиала" bold />
        {availableGroups.length ? (
            <div className={s.groupOptions}>
                {availableGroups.map((group) => (
                    <label key={group.id} className={s.groupOption}>
                        <input
                            type="checkbox"
                            checked={selectedGroupIds.includes(group.id)}
                            onChange={() => toggleGroup(group.id)}
                        />
                        <span><strong>{group.name}</strong><small>{group.style} · {group.level}</small></span>
                    </label>
                ))}
            </div>
        ) : <Text size="s" text="В выбранном филиале пока нет доступных групп." />}
    </div>
);

export const EditClientFormFields = memo((props: EditClientFormFieldsProps) => {
    const {
        form, errors, branchOptions, availableGroups, selectedGroupIds,
        updateField, updateBranch, toggleGroup, onChangeImage,
    } = props;

    return (
        <>
            <ClientInfoFields
                form={form}
                errors={errors}
                branchOptions={branchOptions}
                updateField={updateField}
                updateBranch={updateBranch}
                onChangeImage={onChangeImage}
            />
            {form.branchId && (
                <BranchGroupsPicker
                    availableGroups={availableGroups}
                    selectedGroupIds={selectedGroupIds}
                    toggleGroup={toggleGroup}
                />
            )}
        </>
    );
});
