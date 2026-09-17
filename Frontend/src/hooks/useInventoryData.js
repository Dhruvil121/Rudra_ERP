import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import api from '../services/api/apiClient';

// --- API Calls ---
const fetchInventory = async () => {
    return await api.get('/inventory');
};

const saveInventoryGroup = async (groupData) => {
    if (groupData._id) {
        return await api.put(`/inventory/${groupData._id}`, groupData);
    } else {
        return await api.post('/inventory', groupData);
    }
};

const deleteInventoryGroup = async (id) => {
    return await api.delete(`/inventory/${id}`);
};


// --- TanStack Hooks ---

export const useInventory = () => {
    return useQuery({
        queryKey: ['inventory'],
        queryFn: fetchInventory
    });
};

export const useSaveInventory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: saveInventoryGroup,
        onSuccess: () => {
            // Automatically refresh the inventory list after a successful save
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
        },
    });
};

export const useDeleteInventory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteInventoryGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
        },
    });
};