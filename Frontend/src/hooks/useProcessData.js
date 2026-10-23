import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api/apiClient';

// Fetch a specific order's process sequence (backward compatible — single sequence per order)
export const useProcessSequence = (orderId) => {
    return useQuery({
        queryKey: ['process-sequence', orderId],
        queryFn: () => api.get(`/process-sequence/${orderId}`),
        enabled: !!orderId, // Only run if an orderId is provided
    });
};

// Fetch a specific order item's process sequence (for multi-size support)
export const useProcessSequenceByItem = (orderId, orderItemId) => {
    return useQuery({
        queryKey: ['process-sequence', orderId, orderItemId],
        queryFn: () => api.get(`/process-sequence/${orderId}?itemId=${orderItemId}`),
        enabled: !!orderId && !!orderItemId,
    });
};

// Fetch ALL process sequences for an order (multi-size: one per variant)
export const useAllProcessSequences = (orderId) => {
    return useQuery({
        queryKey: ['process-sequences-all', orderId],
        queryFn: async () => {
            const res = await api.get(`/process-sequence/${orderId}?mode=all`);
            return res.sequences || [];
        },
        enabled: !!orderId,
    });
};

export const useSaveProcessSequence = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ orderId, sequence, orderItemId, sizeVariant, priority, rejectedUsage }) => {
            // Uses the centralized api client which auto-attaches the JWT auth token
            return api.post(`/process-sequence/${orderId}`, {
                steps: sequence,
                orderItemId,
                sizeVariant,
                priority,
                rejectedUsage
            });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['process-sequence', variables.orderId] });
            queryClient.invalidateQueries({ queryKey: ['process-sequences-all', variables.orderId] });
            if (variables.orderItemId) {
                queryClient.invalidateQueries({ queryKey: ['process-sequence', variables.orderId, variables.orderItemId] });
            }
        },
    });
};

// Dispatch an order — confirms rejected piece deductions and marks as Dispatched
export const useDispatchOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ orderId }) => {
            return api.post(`/process-sequence/${orderId}`, { action: 'dispatch' });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['process-sequence', variables.orderId] });
            queryClient.invalidateQueries({ queryKey: ['process-sequences-all', variables.orderId] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_summary'] });
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