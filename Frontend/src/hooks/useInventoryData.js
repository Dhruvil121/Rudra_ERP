import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api/apiClient';

const fetchInventory = async () => {
    const res = await api.get('/inventory');
    return res?.data || res;
};

const saveInventoryGroup = async (groupData) => {
    if (groupData._id) {
        const res = await api.put(`/inventory/${groupData._id}`, groupData);
        return res?.data || res;
    } else {
        const res = await api.post('/inventory', groupData);
        return res?.data || res;
    }
};

const deleteInventoryGroup = async (id) => {
    const res = await api.delete(`/inventory/${id}`);
    return res?.data || res;
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

// Quick-add a single sub-item into an Inventory Group from BOM or Order (+) button
// export const useQuickAddInventoryItem = () => {
//     const queryClient = useQueryClient();
//     return useMutation({
//         mutationFn: async (payload) => {
//             const res = await api.patch('/inventory', { action: 'quick_add_item', ...payload });
//             return res?.data || res;
//         },
//         onSuccess: () => {
//             queryClient.invalidateQueries({ queryKey: ['inventory'] });
//             queryClient.invalidateQueries({ queryKey: ['order-bom'] });
//         }
//     });
// };

// // Deduct After-Market BOM items from Inventory for an Order
// export const useDeductOrderBOM = () => {
//     const queryClient = useQueryClient();
//     return useMutation({
//         mutationFn: async ({ orderId, deductions }) => {
//             const res = await api.patch('/inventory', { action: 'deduct_order_bom', orderId, deductions });
//             return res?.data || res;
//         },
//         onSuccess: () => {
//             queryClient.invalidateQueries({ queryKey: ['inventory'] });
//             queryClient.invalidateQueries({ queryKey: ['orders'] });
//             queryClient.invalidateQueries({ queryKey: ['order-bom'] });
//         }
//     });
// };

// // Add Process Extra pieces back into Inventory
// export const useSyncProcessExtra = () => {
//     const queryClient = useQueryClient();
//     return useMutation({
//         mutationFn: async ({ itemCode, itemName, extraQty }) => {
//             const res = await api.patch('/inventory', { action: 'sync_process_extra', itemCode, itemName, extraQty });
//             return res?.data || res;
//         },
//         onSuccess: () => {
//             queryClient.invalidateQueries({ queryKey: ['inventory'] });
//         }
//     });
// };


export const useQuickAddInventoryItem = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ groupId, newGroupName, item }) => {
            const currentGroups = queryClient.getQueryData(['inventory']) || (await fetchInventory());
            let savedGroup;

            if (!groupId || groupId === 'NEW_GROUP') {
                savedGroup = await saveInventoryGroup({
                    groupName: newGroupName?.trim() || 'General Hardware Inventory',
                    details: 'Auto-created from quick-add',
                    subItems: [item]
                });
            } else {
                const targetGroup = currentGroups.find(g => g._id === groupId);
                if (!targetGroup) throw new Error('Selected Inventory Group not found');
                const updatedSubItems = [...(targetGroup.subItems || []), item];
                savedGroup = await saveInventoryGroup({
                    ...targetGroup,
                    subItems: updatedSubItems
                });
            }

            const createdSubItem =
                savedGroup.subItems?.find(
                    s => s.itemCode?.toUpperCase() === item.itemCode?.toUpperCase()
                ) || savedGroup.subItems?.[savedGroup.subItems.length - 1];

            return { group: savedGroup, subItem: createdSubItem };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
        }
    });
};