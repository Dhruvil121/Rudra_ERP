import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import userApi from '../services/api/userApi';

/** Fetch all users (super_admin only) */
export const useUsers = () => {
    return useQuery({
        queryKey: ['users'],
        queryFn: () => userApi.getAll(),
    });
};

/** Fetch the current user's fresh profile from DB */
export const useCurrentUser = () => {
    return useQuery({
        queryKey: ['currentUser'],
        queryFn: () => userApi.getMe(),
        staleTime: 10 * 1000,
    });
};

/** Create a new manager account */
export const useCreateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (userData) => userApi.create(userData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
};

/** Update a user's permissions */
export const useUpdatePermissions = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, permissions }) => {
            // Normalize BOM and bom so both keys are always kept identical in DB
            const normalized = { ...permissions };
            const bomPerms = Array.from(new Set([
                ...(Array.isArray(normalized.BOM) ? normalized.BOM : []),
                ...(Array.isArray(normalized.bom) ? normalized.bom : [])
            ]));
            if (normalized.BOM !== undefined || normalized.bom !== undefined) {
                normalized.BOM = bomPerms;
                normalized.bom = bomPerms;
            }
            return userApi.updatePermissions(userId, normalized);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        },
    });
};

/** Deactivate (soft-delete) a user */
export const useDeleteUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (userId) => userApi.deactivate(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
};

/** Reactivate a deactivated user */
export const useReactivateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (userId) => userApi.reactivate(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
};