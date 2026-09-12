import { mockInventory } from '../../mocks/inventoryData';

export const getInventoryList = async () => {
    return new Promise((resolve) => {
        // Simulate network delay
        setTimeout(() => {
            resolve(mockInventory);
        }, 600);
    });
};