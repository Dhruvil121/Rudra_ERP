import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api/apiClient';

const fetchInventory = async () => {
    const res = await api.get('/inventory');
    return res.data || res;
};

const saveInventoryGroup = async (groupData) => {
    if (groupData._id) {
        const res = await api.put(`/inventory/${groupData._id}`, groupData);
        return res.data || res;
    } else {
        const res = await api.post('/inventory', groupData);
        return res.data || res;
    }
};

const deleteInventoryGroup = async (id) => {
    return await api.delete(`/inventory/${id}`);
};

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
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_summary'] });
        },
    });
};

export const useDeleteInventory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteInventoryGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_summary'] });
        },
    });
};

// 1. Calls PATCH /api/inventory with action: 'quick_add_item'
export const useQuickAddInventoryItem = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ groupId, newGroupName, item }) => {
            const res = await api.patch('/inventory', {
                action: 'quick_add_item',
                groupId,
                newGroupName,
                item
            });
            return res.data || res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_summary'] });
        }
    });
};

// 2. Calls PATCH /api/inventory with action: 'deduct_order_bom'
export const useDeductOrderBOM = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ orderId, deductions }) => {
            const res = await api.patch('/inventory', {
                action: 'deduct_order_bom',
                orderId,
                deductions
            });
            return res.data || res;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['order-bom', variables.orderId] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_summary'] });
        }
    });
};

// 3. Calls PATCH /api/inventory with action: 'sync_process_extra'
export const useSyncProcessExtra = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ itemCode, itemName, extraQty }) => {
            const res = await api.patch('/inventory', {
                action: 'sync_process_extra',
                itemCode,
                itemName,
                extraQty
            });
            return res.data || res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_summary'] });
        }
    });
};

// 4. Reserve rejected pieces (soft-hold for active process — does NOT deduct stock)
export const useReserveRejected = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ inventorySubItemId, quantity }) => {
            const res = await api.patch('/inventory', {
                action: 'reserve_rejected',
                inventorySubItemId,
                quantity
            });
            return res.data || res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_summary'] });
        }
    });
};

// 5. Confirm dispatch — permanently deduct reserved rejected pieces from stock
export const useConfirmDispatchInventory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ rejectedUsages }) => {
            const res = await api.patch('/inventory', {
                action: 'confirm_dispatch',
                rejectedUsages
            });
            return res.data || res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_summary'] });
        }
    });
};

// 6. Release rejected pieces — cancel reservation if order is cancelled
export const useReleaseRejected = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ rejectedUsages }) => {
            const res = await api.patch('/inventory', {
                action: 'release_rejected',
                rejectedUsages
            });
            return res.data || res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_summary'] });
        }
    });
};