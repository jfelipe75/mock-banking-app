import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import CurrentUserContext from '../contexts/current-user-context';

/**
 * ProtectedRoute Component
 * 
 * Wraps components that require authentication.
 * - Shows loading indicator while checking auth status
 * - Redirects to /login if user is not authenticated
 * - Renders children if user is authenticated
 */
export default function ProtectedRoute({ children }) {
  const { currentUser, isLoading } = useContext(CurrentUserContext);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Render protected content
  return children;
}
