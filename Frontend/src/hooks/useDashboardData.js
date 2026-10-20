import { useQuery } from '@tanstack/react-query';
import api from '../services/api/apiClient';

export const useDashboard = () => {
    return useQuery({
        queryKey: ['dashboard_summary'],
        queryFn: async () => {
            const res = await api.get('/dashboard');
            return res.data || res;
        },
        refetchOnWindowFocus: true,
        staleTime: 0,
        refetchInterval: 30000,
    });
};