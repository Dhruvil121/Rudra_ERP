import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api/apiClient';

export const useAssemblies = () => {
    return useQuery({
        queryKey: ['assemblies'],
        queryFn: async () => {
            try {
                const res = await api.get('/assembling');
                return res.data || res;
            } catch {
                return [];
            }
        }
    });
};

export const useConfirmAssembly = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload) => {
            const res = await api.post('/assembling', payload);
            return res.data || res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assemblies'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['reports'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_summary'] });
        }
    });
};