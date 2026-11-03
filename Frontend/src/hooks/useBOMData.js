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
                return { inHouseParts: [], afterMarketItems: [], packagingItems: [], shortageItems: [], hasShortage: false };
            }

            const results = await Promise.all(
                order.items.map(async (item) => {
                    try {
                        return await calculateBOM(item.rudraCode, Number(item.qty || 0));
                    } catch {
                        return { explodedInHouse: [], explodedBOM: [], explodedPackaging: [] };
                    }
                })
            );

            const inHouseMap = {};
            const afterMarketMap = {};
            const packagingMap = {};

            results.forEach((res) => {
                // In-house
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

                // Fitting Kit (After-Market)
                (res.explodedBOM || []).forEach((mat) => {
                    const key = mat.inventorySubItemId || mat.materialName;
                    if (!afterMarketMap[key]) {
                        afterMarketMap[key] = { ...mat };
                    } else {
                        afterMarketMap[key].requiredQuantity += mat.requiredQuantity;
                        afterMarketMap[key].totalCost = Number(
                            ((afterMarketMap[key].totalCost || 0) + (mat.totalCost || 0)).toFixed(2)
                        );
                        afterMarketMap[key].shortfall = Math.max(
                            0,
                            afterMarketMap[key].requiredQuantity - (afterMarketMap[key].availableStock || 0)
                        );
                        afterMarketMap[key].isLowStock = afterMarketMap[key].shortfall > 0;
                    }
                });

                // Packaging
                (res.explodedPackaging || []).forEach((pack) => {
                    const key = pack.inventorySubItemId || pack.materialName;
                    if (!packagingMap[key]) {
                        packagingMap[key] = { ...pack };
                    } else {
                        packagingMap[key].requiredQuantity += pack.requiredQuantity;
                        packagingMap[key].totalCost = Number(
                            ((packagingMap[key].totalCost || 0) + (pack.totalCost || 0)).toFixed(2)
                        );
                        packagingMap[key].shortfall = Math.max(
                            0,
                            packagingMap[key].requiredQuantity - (packagingMap[key].availableStock || 0)
                        );
                        packagingMap[key].isLowStock = packagingMap[key].shortfall > 0;
                    }
                });
            });

            const afterMarketList = Object.values(afterMarketMap);
            const packagingList = Object.values(packagingMap);
            const shortageItems = [
                ...afterMarketList.filter(i => i.shortfall > 0).map(i => ({ ...i, type: 'Bolt & Fitting' })),
                ...packagingList.filter(i => i.shortfall > 0).map(i => ({ ...i, type: 'Packaging' }))
            ];

            return {
                inHouseParts: Object.values(inHouseMap),
                afterMarketItems: afterMarketList,
                packagingItems: packagingList,
                shortageItems,
                hasShortage: shortageItems.length > 0
            };
        },
        enabled: !!order && !!order._id,
    });
};
