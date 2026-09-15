import api from './apiClient';

/**
 * Fetch all orders or search by PI code.
 */
export const getOrders = async () => {
    return api.get('/orders');
};

/**
 * Search for a specific order by PI code.
 */
export const getOrderByCode = async (code) => {
    return api.get(`/orders?code=${encodeURIComponent(code)}`);
};

/**
 * Create a new order (PI).
 */
export const createOrder = async (orderData) => {
    return api.post('/orders', orderData);
};

/**
 * Update an existing order by ID.
 */
export const updateOrder = async ({ id, ...orderData }) => {
    return api.put(`/orders/${id}`, orderData);
};