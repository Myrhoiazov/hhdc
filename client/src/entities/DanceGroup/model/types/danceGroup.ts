export type GroupLevel = 'START' | 'FAN' | 'PRO';

export interface ScheduleSlot {
    id?: number;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
}

export interface Hall {
    id: number;
    name: string;
    capacity?: number;
}

export interface Choreographer {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
}

export interface Branch {
    id: number;
    name: string;
    city?: string;
    address?: string;
}

export interface DanceGroup {
    id: number;
    name: string;
    style: string;
    level: GroupLevel;
    maxParticipants: number;
    lessonPriceCents?: number;
    choreographerId: number;
    hallId?: number | null;
    branchId?: number | null;
    choreographer: Choreographer;
    hall?: Hall | null;
    branch?: Branch | null;
    slots: ScheduleSlot[];
    createdAt: string;
}

export interface DanceGroupsResponse {
    total: number;
    data: DanceGroup[];
}

export interface GroupStudent {
    id: number;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
    isActive: boolean;
}

export interface GroupStatistics {
    id: number;
    name: string;
    branchId: number;
    activeCount: number;
    inactiveCount: number;
    totalCount: number;
    activeStudents: GroupStudent[];
    inactiveStudents: GroupStudent[];
}

export interface BranchStatistics {
    id: number;
    name: string;
    city?: string | null;
    address?: string | null;
    isActive: boolean;
    groupCount: number;
    capacity: number;
    activeCount: number;
    inactiveCount: number;
    unassignedCount: number;
    activeStudents: GroupStudent[];
    inactiveStudents: GroupStudent[];
}

export interface GroupManagementStatistics {
    totals: {
        branchCount: number;
        groupCount: number;
        activeCount: number;
        inactiveCount: number;
        capacity: number;
    };
    branches: BranchStatistics[];
    groups: GroupStatistics[];
}
