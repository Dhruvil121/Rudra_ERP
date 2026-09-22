import api from './apiClient';

/**
 * User management API methods — all require super_admin JWT.
 */
export const userApi = {
    /** Fetch all users */
    getAll: () => api.get('/users'),

    /** Fetch the current authenticated user's fresh profile from DB */
    getMe: () => api.get('/users/me'),

    /** Create a new manager account */
    create: ({ name, email, password }) =>
        api.post('/users', { name, email, password }),

    /** Update a user's profile and/or permissions */
    update: (userId, data) =>
        api.put(`/users/${userId}`, data),

    /** Update only the permissions for a user */
    updatePermissions: (userId, permissions) =>
        api.put(`/users/${userId}`, { permissions }),

    /** Soft-delete (deactivate) a user */
    deactivate: (userId) =>
        api.delete(`/users/${userId}`),

    /** Reactivate a deactivated user */
    reactivate: (userId) =>
        api.put(`/users/${userId}`, { isActive: true }),
};

export default userApi;
