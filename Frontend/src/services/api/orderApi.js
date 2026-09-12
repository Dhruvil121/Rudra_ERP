import { mockOrders } from '../../mocks/orderData';

export const getOrderByCode = async (code) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const normalizedCode = code.trim().toUpperCase();
            const order = mockOrders[normalizedCode];

            if (order) {
                resolve(order);
            } else {
                reject(new Error('No Order/PI found with this code.'));
            }
        }, 800);
    });
};