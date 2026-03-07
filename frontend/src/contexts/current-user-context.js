import { createContext } from 'react';

const CurrentUserContext = createContext({
  currentUser: null,
  setCurrentUser: () => {},
  isLoading: true,
  clearUserState: () => {},
});

export default CurrentUserContext;
