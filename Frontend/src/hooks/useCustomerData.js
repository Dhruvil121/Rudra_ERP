import { useQuery } from '@tanstack/react-query';
import { getCustomerByCode } from '../services/api/customerApi';

export const useCustomerSearch = (code, shouldSearch) => {
    return useQuery({
        queryKey: ['customer', code],
        queryFn: () => getCustomerByCode(code),
        enabled: shouldSearch && !!code, // Only trigger when user explicitly searches
        retry: false,
        staleTime: 1000 * 60 * 5, // Cache the result for 5 minutes
    });
};