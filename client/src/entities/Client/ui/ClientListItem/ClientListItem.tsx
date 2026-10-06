import { memo, ReactNode } from 'react';
import { Client, ClientView } from '../../model/types/client';
import { getRouteClientDetails } from '@/shared/const/router';
import { ClientListItemSmall } from './ClientListItemSmall';
import { ClientListItemBig } from './ClientListItemBig';

interface ClientListItemProps {
    className?: string;
    client: Client;
    renderAction?: (client: Client) => ReactNode;
    view: ClientView;
}

const ClientListItem = (props: ClientListItemProps) => {
    const { className, client, view, renderAction } = props;
    const fullName = [client.firstName, client.lastName].filter(Boolean).join(' ') || `Ученик #${client.id}`;
    const initials = [client.firstName, client.lastName]
        .filter(Boolean)
        .map((part) => part?.charAt(0).toUpperCase())
        .join('')
        .slice(0, 2) || '?';
    const profileRoute = getRouteClientDetails(String(client.id));
    const hasPaymentAccount = Boolean(client.mollieLinks?.length);

    if (view === ClientView.SMALL) {
        return (
            <ClientListItemSmall
                className={className}
                client={client}
                fullName={fullName}
                initials={initials}
                profileRoute={profileRoute}
                hasPaymentAccount={hasPaymentAccount}
                renderAction={renderAction}
            />
        );
    }

    return (
        <ClientListItemBig
            className={className}
            client={client}
            fullName={fullName}
            initials={initials}
            profileRoute={profileRoute}
            hasPaymentAccount={hasPaymentAccount}
            renderAction={renderAction}
        />
    );
};

export default memo(ClientListItem);