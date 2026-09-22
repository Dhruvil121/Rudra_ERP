import { useQuery } from '@tanstack/react-query';
import api from '../services/api/apiClient';

export const useDashboard = () => {
    return useQuery({
        queryKey: ['dashboard_summary'],
        queryFn: () => api.get('/dashboard'),
        refetchInterval: 60000, // Auto-refresh data every 60 seconds
    });
};