import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CurrentUserContext from "../contexts/current-user-context";
import { getUser } from "../adapters/user-adapter";
import UpdateUsernameForm from "../components/UpdateUsernameForm";
import LogoutButton from "../components/LogoutButton";
import { Alert } from "../components/ui";

export default function UserPage() {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser, clearUserState } = useContext(CurrentUserContext);
  const [userProfile, setUserProfile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
  const isCurrentUserProfile = currentUser && currentUser.id === Number(id);

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      const [user, error] = await getUser(id);
      if (error) {
        setError(error);
      } else {
        setUserProfile(user);
      }
      setLoading(false);
    };

    loadUser();
  }, [id]);

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page">
        <Alert variant="error">
          Sorry, there was a problem loading this profile. Please try again later.
        </Alert>
      </div>
    );
  }

  if (!userProfile) return null;

  // When we update the username, the userProfile state won't change but the currentUser state will.
  const profileUsername = isCurrentUserProfile ? currentUser.username : userProfile.username;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar">
          {profileUsername.charAt(0).toUpperCase()}
        </div>
        <div className="profile-details">
          <h1>{profileUsername}</h1>
          <p>{isCurrentUserProfile ? 'Your Account' : 'User Profile'}</p>
        </div>
      </div>

      {isCurrentUserProfile && (
        <>
          <div className="profile-section">
            <h2>Account Settings</h2>
            <UpdateUsernameForm currentUser={currentUser} setCurrentUser={setCurrentUser} />
          </div>

          <div className="profile-section">
            <h2>Session</h2>
            <p style={{ marginBottom: '1rem', color: 'var(--color-gray-600)' }}>
              Sign out of your account on this device.
            </p>
            <LogoutButton onLogout={clearUserState} />
          </div>
        </>
      )}

      {!isCurrentUserProfile && (
        <div className="profile-section">
          <h2>About</h2>
          <p>This user hasn't added any information yet.</p>
        </div>
      )}
    </div>
  );
}
