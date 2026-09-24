import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api/apiClient';

export const useBOMs = () => {
    return useQuery({
        queryKey: ['boms'],
        queryFn: async () => {
            const res = await api.get('/bom');
            return res.data || res;
        }
    });
};

export const useSaveBOM = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (bomData) => {
            if (bomData._id) {
                return await api.put(`/bom/${bomData._id}`, bomData);
            }
            return await api.post('/bom', bomData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['boms'] });
        }
    });
};

export const useDeleteBOM = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id) => await api.delete(`/bom/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['boms'] });
        }
    });
};