import { useQuery } from '@tanstack/react-query';
import api from '../services/api/apiClient';

export const useReports = (reportType = 'daily', date = '') => {
    return useQuery({
        queryKey: ['reports', reportType, date],
        queryFn: async () => {
            const params = new URLSearchParams({
                type: reportType,
                date: date || ''
            });
            const res = await api.get(`/reports?${params.toString()}`);
            return res.data || res;
        },
        refetchOnWindowFocus: true,
        staleTime: 0
    });
};