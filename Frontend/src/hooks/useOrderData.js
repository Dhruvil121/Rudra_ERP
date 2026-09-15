import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrderByCode, createOrder } from '../services/api/orderApi';

export const useOrderSearch = (code, shouldSearch) => {
    return useQuery({
        queryKey: ['order', code],
        queryFn: () => getOrderByCode(code),
        enabled: shouldSearch && !!code,
        retry: false,
        staleTime: 1000 * 60 * 5,
    });
};

export const useCreateOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
    });
};