export const choreographerName = (item: {
    person: { displayName: string };
    profile: { stageName: string | null } | null;
}) => item.profile?.stageName || item.person.displayName;
