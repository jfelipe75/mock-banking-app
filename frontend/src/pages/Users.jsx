import { useEffect, useState } from "react";
import { getAllUsers } from "../adapters/user-adapter";
import UserLink from "../components/UserLink";
import { Alert } from "../components/ui";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      const [data, error] = await getAllUsers();
      if (error) setError(error);
      else if (data) setUsers(data);
      setLoading(false);
    }
    loadUsers();
  }, []);

  if (loading) {
    return (
      <div className="users-page">
        <h1>Users</h1>
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="users-page">
        <h1>Users</h1>
        <Alert variant="error">
          Sorry, there was a problem loading users. Please try again later.
        </Alert>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="users-page">
        <h1>Users</h1>
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <p>No users found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="users-page">
      <h1>Users</h1>
      <div className="users-grid">
        {users.map((user) => (
          <div key={user.id} className="user-card">
            <div className="user-avatar">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <UserLink user={user} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
