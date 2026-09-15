import api from './apiClient';

/**
 * Fetch all inventory groups with sub-items.
 */
export const getInventoryList = async () => {
    return api.get('/inventory');
};

/**
 * Create a new inventory group.
 */
export const createInventoryGroup = async (groupData) => {
    return api.post('/inventory', groupData);
};