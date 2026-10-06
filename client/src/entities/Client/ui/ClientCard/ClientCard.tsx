import { classNames } from '@/shared/lib/classNames/classNames';
import { memo } from 'react';
import { Client, ClientLanguage } from '@/entities/Client';
import { SelectOption } from '@/shared/ui/Select/Select';
import s from './ClientCard.module.scss';
import { ClientCardIdentityFields } from './ClientCardIdentityFields';
import { ClientCardContactFields } from './ClientCardContactFields';
import { ClientCardEnrollmentFields } from './ClientCardEnrollmentFields';

export interface ClientCardProps {
    className?: string;
    data?: Client;
    error?: string;
    isLoading?: boolean;
    readonly?: boolean;
    onChangeLastName?: (value?: string) => void;
    onChangeFirstName?: (value?: string) => void;
    onChangeCity?: (value?: string) => void;
    onChangeEmail?: (value?: string) => void;
    onChangeBirthday?: (value?: string) => void;
    onChangePhoneNumber?: (value?: string) => void;
    onChangeSocial?: (value?: string) => void;
    onChangeBranchId?: (value?: string) => void;
    onChangePreferredLanguage?: (value?: ClientLanguage) => void;
    onChangeImage?: (value?: File) => void;
    branchOptions?: SelectOption<string>[];
}

export const ClientCard = memo((props: ClientCardProps) => {
    const {
        className,
        data,
        onChangeFirstName,
        onChangeLastName,
        onChangeBirthday,
        onChangeEmail,
        onChangeImage,
        onChangePhoneNumber,
        onChangeSocial,
        onChangeBranchId,
        onChangePreferredLanguage,
        branchOptions = [],
    } = props;

    return (
        <div className={classNames(s.ClientCard, {}, [className])}>
            <div className={s.grid}>
                <ClientCardIdentityFields
                    data={data}
                    onChangeFirstName={onChangeFirstName}
                    onChangeLastName={onChangeLastName}
                    onChangeBirthday={onChangeBirthday}
                />
                <ClientCardContactFields
                    data={data}
                    onChangePhoneNumber={onChangePhoneNumber}
                    onChangeEmail={onChangeEmail}
                    onChangeSocial={onChangeSocial}
                />
                <ClientCardEnrollmentFields
                    data={data}
                    branchOptions={branchOptions}
                    onChangeBranchId={onChangeBranchId}
                    onChangePreferredLanguage={onChangePreferredLanguage}
                    onChangeImage={onChangeImage}
                />
            </div>
        </div>
    );
});

export default ClientCard;