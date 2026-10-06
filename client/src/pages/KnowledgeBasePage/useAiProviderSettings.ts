import { useCallback, useEffect, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';
import { toast } from 'react-toastify';
import type { AiProviderSettings, AiDraftProvider } from './aiProviderSettingsTypes';

export const useAiProviderSettings = () => {
  const [settings, setSettings] = useState<AiProviderSettings | null>(null);
  const [provider, setProvider] = useState<AiDraftProvider>('OLLAMA');
  const [model, setModel] = useState('');
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { const response = await $apiPrivate.get<AiProviderSettings>('/ai-email/settings'); if (!response.data?.provider || !response.data?.model) return; setSettings(response.data); setProvider(response.data.provider); setModel(response.data.model); }, []);
  useEffect(() => { load().catch(() => setError('Не удалось загрузить настройки AI')); }, [load]);
  const save = async () => { setBusy(true); setError(null); try { const response = await $apiPrivate.put<AiProviderSettings>('/ai-email/settings', { provider, model }); setSettings(response.data); toast.success('Провайдер AI сохранён'); } catch { setError('Не удалось сохранить настройки AI'); } finally { setBusy(false); } };
  const test = async () => { setTesting(true); setError(null); try { await $apiPrivate.post('/ai-email/settings/test'); toast.success('Провайдер доступен'); } catch (e: any) { setError(e?.response?.data?.errorCode ? `Проверка не пройдена: ${e.response.data.errorCode}` : 'Проверка не пройдена'); } finally { setTesting(false); } };
  return { settings, provider, setProvider, model, setModel, busy, testing, error, save, test };
};
