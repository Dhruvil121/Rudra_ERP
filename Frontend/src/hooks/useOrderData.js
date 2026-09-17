import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import api from '../services/api/apiClient';

const fetchOrders = async () => {
    return await api.get('/orders');
};

const saveOrder = async (orderData) => {
    if (orderData._id) {
        return await api.put(`/orders/${orderData._id}`, orderData);
    } else {
        return await api.post('/orders', orderData);
    }
};

export const useOrders = () => {
    return useQuery({ queryKey: ['orders'], queryFn: fetchOrders });
};

export const useSaveOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: saveOrder,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
    });
};