import { postData, readPage } from '@/shared/api/request';
import { Campaign, CampaignPreview } from '../model/types';

export const listCampaigns = async () => readPage<Campaign>('/campaigns');

export const previewCampaign = async (id: string) =>
    postData<CampaignPreview>(`/campaigns/${id}/preview`);

export const sendCampaign = async (id: string, confirmRecipientCount: number) =>
    postData<unknown>(`/campaigns/${id}/send`, { confirmRecipientCount });
