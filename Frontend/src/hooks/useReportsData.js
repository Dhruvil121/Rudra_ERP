import { useQuery } from '@tanstack/react-query';
import api from '../services/api/apiClient';

export const useReports = (type = 'daily', date) => {
    return useQuery({
        queryKey: ['reports', type, date],
        queryFn: () => {
            const params = new URLSearchParams({ type });
            if (date) params.append('date', date);
            return api.get(`/reports?${params.toString()}`);
        },
        refetchInterval: 60000, // Auto-refresh data every 60 seconds
    });
};
