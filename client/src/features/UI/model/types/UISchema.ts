// <Адрес страницы, позиция скролла>
export type ScrollSchema = Record<string, number>;

export interface UISchema {
    scroll: ScrollSchema;
}

declare module '@/shared/lib/store/StateSchema' {
    interface StateSchema {
        ui: UISchema;
    }
}
