// export enum ClientStatus {
//     ALL = 'ALL',
//     BRONZE = 'BRONZE',
//     SILVER = 'SILVER',
//     GOLD = 'GOLD',
//     PLATINUM = 'PLATINUM'
// }

export enum ClientStatusKey {
    all = 'all',
    bronze = 'bronze',
    silver = 'silver',
    gold = 'gold',
}

export const ClientStatusLabels: Record<ClientStatusKey, string> = {
    [ClientStatusKey.all]: "Все клиенты",
    [ClientStatusKey.bronze]: "Красный",
    [ClientStatusKey.silver]: "Желтый",
    [ClientStatusKey.gold]: "Зеленый",
};