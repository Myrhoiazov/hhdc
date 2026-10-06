import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/Text/Text';
import { VStack } from '@/shared/ui/Stack';
import { Card } from '@/shared/ui/Card/Card';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import { getStudentName, PayerRelation, useStudentLinksManager } from './useStudentLinksManager';
import s from './MollieCustomerDetails.module.scss';

const payerRelationOptions: SelectOption<PayerRelation>[] = [
    { value: 'parent', content: 'Родитель' },
    { value: 'self', content: 'Сам ученик' },
    { value: 'guardian', content: 'Опекун' },
    { value: 'other', content: 'Другой плательщик' },
    { value: 'unknown', content: 'Неизвестно' },
];

interface MollieStudentLinksManagerProps {
    customerId: string;
    version: number;
    onChanged: () => void;
}

const LinkedStudents = ({
    clientLinks,
    isSaving,
    onDeleteLink,
}: {
    clientLinks: ReturnType<typeof useStudentLinksManager>['clientLinks'];
    isSaving: boolean;
    onDeleteLink: (linkId: string | number) => void;
}) => {
    const { t } = useTranslation();
    if (!clientLinks.length) {
        return <Text text="Пока нет связанных учеников." size="s" />;
    }

    return (
        <div className={s.linkedStudents}>
            {clientLinks.map((link) => (
                <div className={s.studentLinkRow} key={link.id}>
                    <div className={s.studentInfo}>
                        {link.client?.id ? (
                            <Link className={s.studentName} to={`/clients/${link.client.id}`}>
                                {getStudentName(link.client)}
                            </Link>
                        ) : (
                            <span className={s.studentName}>{t('Ученик')}</span>
                        )}
                        <span className={s.studentMeta}>
                            {link.payerRelation || 'unknown'} · {link.linkSource || 'manual'}{link.isPrimary ? ' · primary' : ''}
                        </span>
                    </div>
                    <Button
                        theme={ButtonTheme.OUTLINE_RED}
                        onClick={() => onDeleteLink(link.id)}
                        disabled={isSaving}
                    >
                        {t('Удалить')}
                    </Button>
                </div>
            ))}
        </div>
    );
};

const AddStudentForm = ({
    selectedClientId,
    setSelectedClientId,
    payerRelation,
    setPayerRelation,
    availableClientOptions,
    isSaving,
    onAddStudent,
}: {
    selectedClientId: string;
    setSelectedClientId: (value: string) => void;
    payerRelation: PayerRelation;
    setPayerRelation: (value: PayerRelation) => void;
    availableClientOptions: SelectOption<string>[];
    isSaving: boolean;
    onAddStudent: () => void;
}) => {
    const { t } = useTranslation();
    return (
        <div className={s.addStudentForm}>
            <Select
                label="Ученик"
                defaultValue="Выберите ученика"
                options={availableClientOptions}
                value={selectedClientId}
                onChange={setSelectedClientId}
            />
            <Select<PayerRelation>
                label="Кто платит"
                options={payerRelationOptions}
                value={payerRelation}
                onChange={setPayerRelation}
            />
            <Button
                className={s.addStudentButton}
                theme={ButtonTheme.BACKGROUND_INVERTED}
                onClick={onAddStudent}
                disabled={isSaving || !availableClientOptions.length}
            >
                {t('Привязать')}
            </Button>
        </div>
    );
};

export const MollieStudentLinksManager = memo(({ customerId, version, onChanged }: MollieStudentLinksManagerProps) => {
    const {
        clientLinks, selectedClientId, setSelectedClientId, payerRelation, setPayerRelation,
        isLoading, isSaving, error, availableClientOptions, onAddStudent, onDeleteLink,
    } = useStudentLinksManager(customerId, version, onChanged);

    return (
        <Card padding="16" fullWidth className={s.studentLinksCard}>
            <VStack gap="16" max>
                <div>
                    <Text title="Ученики этого плательщика" size="m" bold />
                    <Text text="Один родительский платёжный профиль может оплачивать несколько учеников." size="s" className={s.subtitle} />
                </div>

                {isLoading && (
                    <>
                        <Skeleton width="100%" height={48} border="12px" />
                        <Skeleton width="100%" height={48} border="12px" />
                    </>
                )}

                {error && (
                    <Text text="Не удалось загрузить связи с учениками." size="s" />
                )}

                {!isLoading && !error && (
                    <>
                        <LinkedStudents clientLinks={clientLinks} isSaving={isSaving} onDeleteLink={onDeleteLink} />

                        <AddStudentForm
                            selectedClientId={selectedClientId} setSelectedClientId={setSelectedClientId}
                            payerRelation={payerRelation} setPayerRelation={setPayerRelation}
                            availableClientOptions={availableClientOptions} isSaving={isSaving} onAddStudent={onAddStudent}
                        />
                    </>
                )}
            </VStack>
        </Card>
    );
});
