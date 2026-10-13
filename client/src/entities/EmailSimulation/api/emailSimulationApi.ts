import { postData, readData, readPage } from '@/shared/api/request';
import {
    EmailSimulation,
    EmailSimulationInput,
    SimulationRunSummary,
    SimulationRun,
    SIMULATION_PAGE_SIZE,
} from '../model/types';

export const listSimulationRuns = async (pageNumber = 1) =>
    readPage<SimulationRunSummary>(
        `/ai/email-simulations?page=${pageNumber}&pageSize=${SIMULATION_PAGE_SIZE}`
    );

export const getSimulationRun = async (id: string) =>
    readData<SimulationRun>(`/ai/email-simulations/${id}`);

// Runs the real assistant on a pasted email; nothing is stored or sent.
export const simulateEmail = async (input: EmailSimulationInput) =>
    postData<EmailSimulation>('/ai/email-simulation', input);
