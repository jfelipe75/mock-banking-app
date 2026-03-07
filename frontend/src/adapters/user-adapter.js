import { apiFetch, patchOptions } from './apiClient';

const baseUrl = '/api/users';

/**
 * Get all users.
 */
export const getAllUsers = async () => {
  return await apiFetch(baseUrl);
};

/**
 * Get a single user by ID.
 */
export const getUser = async (id) => {
  return apiFetch(`${baseUrl}/${id}`);
};

/**
 * Update a user's username.
 */
export const updateUsername = async ({ id, username }) => {
  return apiFetch(`${baseUrl}/${id}`, patchOptions({ id, username }));
};

