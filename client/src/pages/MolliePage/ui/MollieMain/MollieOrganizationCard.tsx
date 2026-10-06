import { memo } from 'react';
import { VStack } from '@/shared/ui/Stack';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';
import { OrganizationProfile } from './useMollieOrganizations';
import { MollieOrganizationDetails } from './MollieOrganizationDetails';
import s from './MollieMain.module.scss';

interface MollieOrganizationCardProps {
    org: OrganizationProfile;
}

export const MollieOrganizationCard = memo(({ org }: MollieOrganizationCardProps) => (
    <Card padding="24" fullWidth className={s.companyCard}>
        <VStack gap="16" max>
            <div className={s.companyHeader}>
                <div>
                    <Text title={org.name} size="m" bold />
                    <Text text={org.description || org.id} size="s" className={s.subtitle} />
                </div>
                <span className={`${s.badge} ${org.status === 'verified' ? s.verified : ''}`}>
                    {org.status}
                </span>
            </div>
            <MollieOrganizationDetails org={org} />
        </VStack>
    </Card>
));