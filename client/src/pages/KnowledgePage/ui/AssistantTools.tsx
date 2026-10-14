import { memo } from 'react';
import { useResource } from '@/shared/lib/useResource/useResource';
import { RequestState } from '@/shared/ui/RequestState';
import { EmailSimulationPanel } from './simulation/EmailSimulationPanel';
import { PromptLibraryPanel } from './prompts/PromptLibraryPanel';
import { loadAssistantSettings } from '../model/loadAssistantSettings';

// Simulation and prompts share the saved prompt versions, so they are loaded once for both tabs.
export const AssistantTools = memo(({ tab }: { tab: 'simulation' | 'prompts' }) => {
    const settings = useResource(loadAssistantSettings);
    return (
        <>
            <RequestState error={settings.error} loading={settings.loading} />
            {settings.data &&
                (tab === 'simulation' ? (
                    <EmailSimulationPanel
                        prompts={settings.data.prompts}
                        providers={settings.data.providers}
                    />
                ) : (
                    <PromptLibraryPanel
                        prompts={settings.data.prompts}
                        defaults={settings.data.defaults}
                        onChanged={() => void settings.refresh()}
                    />
                ))}
        </>
    );
});
