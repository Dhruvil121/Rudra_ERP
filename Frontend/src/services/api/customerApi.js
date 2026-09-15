import api from './apiClient';

/**
 * Fetch all customers from the backend.
 */
export const getCustomers = async () => {
    return api.get('/customers');
};

/**
 * Create a new customer in the database.
 */
export const createCustomer = async (customerData) => {
    return api.post('/customers', customerData);
};

/**
 * Update an existing customer by ID.
 */
export const updateCustomer = async ({ id, ...customerData }) => {
    return api.put(`/customers/${id}`, customerData);
};

/**
 * Delete a customer by ID.
 */
export const deleteCustomer = async (id) => {
    return api.delete(`/customers/${id}`);
};