import { useState, useEffect, useCallback } from 'react';
import CurrentUserContext from './current-user-context';
import { checkForLoggedInUser } from '../adapters/auth-adapter';
import { clearCsrfToken } from '../adapters/apiClient';

export default function CurrentUserContextProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Clear all user state (used on logout)
   */
  const clearUserState = useCallback(() => {
    setCurrentUser(null);
    clearCsrfToken();
  }, []);

  // Check for logged in user on mount
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const [data] = await checkForLoggedInUser();
        if (data) {
          setCurrentUser(data);
        }
      } catch (error) {
        console.warn('Error checking authentication:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadCurrentUser();
  }, []);

  // Multi-tab logout synchronization
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'logout-event') {
        // Another tab triggered logout
        clearUserState();
        // Redirect to home page
        window.location.href = '/';
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [clearUserState]);

  const context = { 
    currentUser, 
    setCurrentUser, 
    isLoading,
    clearUserState 
  };

  return (
    <CurrentUserContext.Provider value={context}>
      {children}
    </CurrentUserContext.Provider>
  );
}
