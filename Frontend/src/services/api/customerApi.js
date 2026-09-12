import { mockCustomers } from '../../mocks/customerData';

/**
 * Simulates fetching customer details by their unique code.
 * @param {string} code 
 * @returns {Promise<Object>}
 */
export const getCustomerByCode = async (code) => {
    return new Promise((resolve, reject) => {
        // Simulate an 800ms network delay to trigger UI loading states
        setTimeout(() => {
            // Normalize the input so 'cust101' and 'CUST101' both work
            const normalizedCode = code.trim().toUpperCase();
            const customer = mockCustomers[normalizedCode];

            if (customer) {
                resolve(customer);
            } else {
                // Simulating a 404 Not Found response
                reject(new Error('Invalid Code: No customer found with this ID.'));
            }
        }, 800);
    });
};