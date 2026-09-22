import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api/apiClient';

// Fetch a specific order's process sequence
export const useProcessSequence = (orderId) => {
    return useQuery({
        queryKey: ['process-sequence', orderId],
        queryFn: () => api.get(`/process-sequence/${orderId}`),
        enabled: !!orderId, // Only run if an orderId is provided
    });
};

export const useSaveProcessSequence = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ orderId, sequence }) => {
            // Uses the centralized api client which auto-attaches the JWT auth token
            return api.post(`/process-sequence/${orderId}`, { steps: sequence });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['process-sequence', variables.orderId] });
        },
    });
};

/**
 * Fetch all unique process step names across all orders.
 * Used by Settings → Process Access tab so admin can assign permissions
 * based on the ACTUAL step names that exist in the system.
 */
export const useAllProcessStepNames = () => {
    return useQuery({
        queryKey: ['process-step-names'],
        queryFn: async () => {
            const data = await api.get('/process-sequence/steps');
            return data.steps || [];
        },
        staleTime: 30 * 1000, // Cache for 30 seconds
    });
};