import { $apiPrivate } from '@/shared/api/api';
import { patchData, postData, readData } from '@/shared/api/request';
import { TeamMember, TeamMemberInput, TeamMemberChange, PersonTeamRole } from '../model/types';

export const listEventTeam = async (eventId: string) =>
    readData<TeamMember[]>(`/events/${eventId}/team`);

export const addTeamMember = async (eventId: string, input: TeamMemberInput) =>
    postData<TeamMember>(`/events/${eventId}/team`, input);

export const updateTeamMember = async (
    eventId: string,
    memberId: string,
    change: TeamMemberChange
) => patchData<TeamMember>(`/events/${eventId}/team/${memberId}`, change);

export const removeTeamMember = async (eventId: string, memberId: string) => {
    await $apiPrivate.delete(`/events/${eventId}/team/${memberId}`);
};

export const listPersonTeamRoles = async (personId: string) =>
    readData<PersonTeamRole[]>(`/people/${personId}/team-roles`);
