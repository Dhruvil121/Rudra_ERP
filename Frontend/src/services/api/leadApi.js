import { api } from './apiClient';

const buildQueryString = (params = {}) => {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query.set(key, value);
        }
    });

    return query.toString();
};

export const leadApi = {
    getLeads: async (params = {}) => {
        const queryString = buildQueryString(params);

        const endpoint = queryString
            ? `/leads?${queryString}`
            : '/leads';

        return api.get(endpoint);
    },

    updateLead: async (id, data) => {
        return api.put(`/leads/${id}`, data);
    }
};