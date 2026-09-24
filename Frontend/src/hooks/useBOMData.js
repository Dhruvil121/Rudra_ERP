import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api/apiClient';

export const calculateBOM = async (finishedItemCode, quantity) => {
    return await api.post('/bom/calculate', { finishedItemCode, quantity });
};

export const useCalculateOrderBOM = (order) => {
    return useQuery({
        queryKey: ['order-bom', order?._id],
        queryFn: async () => {
            if (!order || !order.items || order.items.length === 0) return [];
            
            const bomPromises = order.items.map(async (item) => {
                try {
                    const result = await calculateBOM(item.rudraCode, Number(item.qty));
                    return result.explodedBOM; // Assuming backend returns { explodedBOM: [...] }
                } catch (error) {
                    // Ignore if BOM not found for an item
                    return [];
                }
            });

            const results = await Promise.all(bomPromises);
            
            // Flatten and aggregate quantities for the same material
            const aggregated = {};
            results.flat().forEach(material => {
                if (material && material.inventorySubItemId) {
                    if (!aggregated[material.inventorySubItemId]) {
                        aggregated[material.inventorySubItemId] = { ...material };
                    } else {
                        aggregated[material.inventorySubItemId].requiredQuantity += material.requiredQuantity;
                    }
                }
            });

            return Object.values(aggregated);
        },
        enabled: !!order && !!order._id,
    });
};
