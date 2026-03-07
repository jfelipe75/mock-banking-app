import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logUserOut } from '../adapters/auth-adapter';

/**
 * LogoutButton Component
 * 
 * A secure logout button with confirmation dialog.
 * Handles session invalidation, CSRF token clearing, and multi-tab sync.
 * 
 * @param {Object} props
 * @param {Function} props.onLogout - Callback to clear user from context
 */
export default function LogoutButton({ onLogout }) {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState('');

  const handleLogoutClick = () => {
    setShowConfirm(true);
    setError('');
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setError('');
  };

  const handleConfirmLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    setError('');

    try {
      const [, logoutError] = await logUserOut();

      if (logoutError) {
        setError('Failed to sign out. Please try again.');
        setIsLoggingOut(false);
        return;
      }

      // Emit logout event for multi-tab sync
      localStorage.setItem('logout-event', Date.now().toString());

      // Clear user from context
      if (onLogout) {
        onLogout();
      }

      // Close modal and redirect
      setShowConfirm(false);
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* Logout Button */}
      <button
        type="button"
        className="logout-btn"
        onClick={handleLogoutClick}
        aria-label="Sign out of your account"
        disabled={isLoggingOut}
      >
        Sign out
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div 
          className="logout-modal-overlay" 
          role="dialog" 
          aria-modal="true"
          aria-labelledby="logout-dialog-title"
        >
          <div className="logout-modal">
            <h2 id="logout-dialog-title">Sign out</h2>
            <p>Are you sure you want to sign out?</p>

            {error && (
              <div className="logout-error" role="alert">
                {error}
              </div>
            )}

            <div className="logout-modal-actions">
              <button
                type="button"
                className="logout-cancel-btn"
                onClick={handleCancel}
                disabled={isLoggingOut}
              >
                Cancel
              </button>
              <button
                type="button"
                className="logout-confirm-btn"
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
                aria-busy={isLoggingOut}
              >
                {isLoggingOut ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
