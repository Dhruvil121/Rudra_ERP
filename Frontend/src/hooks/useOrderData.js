import { useQuery } from '@tanstack/react-query';
import { getOrderByCode } from '../services/api/orderApi';

export const useOrderSearch = (code, shouldSearch) => {
    return useQuery({
        queryKey: ['order', code],
        queryFn: () => getOrderByCode(code),
        enabled: shouldSearch && !!code,
        retry: false,
        staleTime: 1000 * 60 * 5,
    });
};