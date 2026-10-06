
import { IProfile } from '@/entities/Profile';

export interface SettingsPageSchema {
    isLoading?: boolean;
    error?: string;
    users?: IProfile[]

    _inited: boolean
}
