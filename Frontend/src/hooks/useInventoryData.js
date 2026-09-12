import { useQuery } from '@tanstack/react-query';
import { getInventoryList } from '../services/api/inventoryApi';

export const useInventory = () => {
    return useQuery({
        queryKey: ['inventory'],
        queryFn: getInventoryList,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });
};