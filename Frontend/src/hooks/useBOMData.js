import { useQuery } from '@tanstack/react-query';
import api from '../services/api/apiClient';

export const calculateBOM = async (finishedItemCode, quantity) => {
    const res = await api.post('/bom/calculate', { finishedItemCode, quantity });
    return res.data || res;
};

export const useCalculateOrderBOM = (order) => {
    return useQuery({
        queryKey: ['order-bom', order?._id, order?.items],
        queryFn: async () => {
            if (!order || !order.items || order.items.length === 0) {
                return { inHouseParts: [], afterMarketItems: [] };
            }

            const results = await Promise.all(
                order.items.map(async (item) => {
                    try {
                        return await calculateBOM(item.rudraCode, Number(item.qty || 0));
                    } catch {
                        return { explodedInHouse: [], explodedBOM: [] };
                    }
                })
            );

            const inHouseMap = {};
            const afterMarketMap = {};

            results.forEach((res) => {
                (res.explodedInHouse || []).forEach((part) => {
                    const key = part.partCode || part.fieldName;
                    if (!inHouseMap[key]) {
                        inHouseMap[key] = { ...part };
                    } else {
                        inHouseMap[key].requiredPieces += part.requiredPieces;
                        inHouseMap[key].totalWeightKg = Number(
                            (inHouseMap[key].totalWeightKg + (part.totalWeightKg || 0)).toFixed(3)
                        );
                    }
                });

                (res.explodedBOM || []).forEach((mat) => {
                    const key = mat.inventorySubItemId || mat.materialName;
                    if (!afterMarketMap[key]) {
                        afterMarketMap[key] = { ...mat };
                    } else {
                        afterMarketMap[key].requiredQuantity += mat.requiredQuantity;
                        afterMarketMap[key].shortfall = Math.max(
                            0,
                            afterMarketMap[key].requiredQuantity - (afterMarketMap[key].availableStock || 0)
                        );
                    }
                });
            });

            return {
                inHouseParts: Object.values(inHouseMap),
                afterMarketItems: Object.values(afterMarketMap)
            };
        },
        enabled: !!order && !!order._id,
    });
};