import { apiFetch, postOptions, deleteOptions, fetchCsrfToken, clearCsrfToken } from './apiClient';

const baseUrl = '/api/auth';

/**
 * Register a new user.
 * After successful registration, fetches CSRF token.
 * @param {Object} credentials - User credentials
 * @param {string} credentials.email - User email (sent as username to backend)
 * @param {string} credentials.password - User password
 */
export const registerUser = async ({ email, password }) => {
  // Backend expects 'username', but frontend uses 'email' for UX
  const [data, error] = await apiFetch(`${baseUrl}/register`, postOptions({ username: email, password }));
  
  // Fetch CSRF token after successful registration
  if (data && !error) {
    await fetchCsrfToken();
  }
  
  return [data, error];
};

/**
 * Log in an existing user.
 * After successful login, fetches CSRF token.
 * @param {Object} credentials - User credentials
 * @param {string} credentials.email - User email (sent as username to backend)
 * @param {string} credentials.password - User password
 */
export const logUserIn = async ({ email, password }) => {
  // Backend expects 'username', but frontend uses 'email' for UX
  const [data, error] = await apiFetch(`${baseUrl}/login`, postOptions({ username: email, password }));
  
  // Fetch CSRF token after successful login
  if (data && !error) {
    await fetchCsrfToken();
  }
  
  return [data, error];
};

/**
 * Log out the current user.
 * Clears the CSRF token from memory.
 */
export const logUserOut = async () => {
  const result = await apiFetch(`${baseUrl}/logout`, deleteOptions());
  clearCsrfToken();
  return result;
};

/**
 * Check if user is logged in and get their data.
 * If authenticated, also fetches the CSRF token.
 */
export const checkForLoggedInUser = async () => {
  const [data, error] = await apiFetch(`${baseUrl}/me`);
  
  // Fetch CSRF token if user is authenticated
  if (data && !error) {
    await fetchCsrfToken();
  }
  
  return [data, error];
};
