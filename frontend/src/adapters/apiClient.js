/**
 * API Client with CSRF Protection
 * 
 * - Stores CSRF token in memory (never in localStorage)
 * - Automatically attaches CSRF token to state-changing requests
 * - All requests include credentials for cookie-based auth
 */

// CSRF token stored only in memory
let csrfToken = null;

/**
 * Set the CSRF token in memory.
 * @param {string} token - The CSRF token from the server.
 */
export const setCsrfToken = (token) => {
  csrfToken = token;
};

/**
 * Get the current CSRF token from memory.
 * @returns {string|null} The current CSRF token.
 */
export const getCsrfToken = () => csrfToken;

/**
 * Clear the CSRF token from memory.
 * Called on logout.
 */
export const clearCsrfToken = () => {
  csrfToken = null;
};

/**
 * Fetch the CSRF token from the server and store it in memory.
 * Should be called after successful login/registration.
 * @returns {Promise<string|null>} The CSRF token or null on failure.
 */
export const fetchCsrfToken = async () => {
  try {
    const response = await fetch('/api/auth/csrf', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      console.warn('Failed to fetch CSRF token:', response.status);
      return null;
    }

    const data = await response.json();
    csrfToken = data.csrfToken;
    return csrfToken;
  } catch (error) {
    console.warn('Error fetching CSRF token:', error);
    return null;
  }
};

// HTTP methods that require CSRF protection
const STATE_CHANGING_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];

/**
 * Wrapper around fetch that automatically includes credentials
 * and attaches CSRF token to state-changing requests.
 * 
 * @param {string} url - The URL to fetch.
 * @param {Object} options - Fetch options.
 * @returns {Promise<[any, Error|null]>} Tuple of [data, error].
 */
export const apiFetch = async (url, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  
  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Attach CSRF token to state-changing requests
  if (STATE_CHANGING_METHODS.includes(method) && csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }

  const fetchOptions = {
    ...options,
    method,
    credentials: 'include',
    headers,
  };

  // Remove Content-Type for FormData (let browser set it)
  if (options.body instanceof FormData) {
    delete fetchOptions.headers['Content-Type'];
  }

  try {
    const response = await fetch(url, fetchOptions);
    const { ok, status, headers: responseHeaders } = response;
    const isJson = (responseHeaders.get('content-type') || '').includes('application/json');

    if (!ok) {
      // Parse error response to extract user-friendly message
      let errorMessage = 'An error occurred. Please try again.';
      let errorCode = null;
      
      if (isJson) {
        try {
          const errorData = await response.json();
          // Use the message field from the API response if available
          if (errorData.message) {
            errorMessage = errorData.message;
          }
          if (errorData.error) {
            errorCode = errorData.error;
          }
        } catch {
          // Failed to parse JSON, use default message
        }
      }
      
      const error = new Error(errorMessage);
      error.status = status;
      error.code = errorCode;
      throw error;
    }

    const responseData = await (isJson ? response.json() : response.text());

    return [responseData, null];
  } catch (error) {
    console.warn(error);
    return [null, error];
  }
};

/**
 * Helper to create POST request options.
 * @param {Object} body - The request body.
 * @returns {Object} Fetch options for POST request.
 */
export const postOptions = (body) => ({
  method: 'POST',
  body: JSON.stringify(body),
});

/**
 * Helper to create PATCH request options.
 * @param {Object} body - The request body.
 * @returns {Object} Fetch options for PATCH request.
 */
export const patchOptions = (body) => ({
  method: 'PATCH',
  body: JSON.stringify(body),
});

/**
 * Helper to create PUT request options.
 * @param {Object} body - The request body.
 * @returns {Object} Fetch options for PUT request.
 */
export const putOptions = (body) => ({
  method: 'PUT',
  body: JSON.stringify(body),
});

/**
 * Helper to create DELETE request options.
 * @returns {Object} Fetch options for DELETE request.
 */
export const deleteOptions = () => ({
  method: 'DELETE',
});
