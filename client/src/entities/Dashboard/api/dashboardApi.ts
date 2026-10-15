import { readData } from '@/shared/api/request';
import { DashboardInsights } from '../model/types';

export const getDashboardInsights = async () => readData<DashboardInsights>('/dashboard/insights');

export const getDashboard = async () => readData<Record<string, number>>('/dashboard');
