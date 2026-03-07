import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateUsername } from "../adapters/user-adapter";
import { Button, Input, FormField, Alert } from "./ui";

export default function UpdateUsernameForm({ currentUser, setCurrentUser }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const [user, err] = await updateUsername({ id: currentUser.id, username });
    
    // If our user isn't who they say they are
    // (an auth error on update) log them out
    if (err?.cause > 400 && err?.cause < 500) {
      setCurrentUser(null);
      return navigate('/');
    }

    if (err) {
      setError(err.message || 'Failed to update username');
      setLoading(false);
      return;
    }

    setCurrentUser(user);
    setUsername('');
    setSuccess(true);
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="update-form" aria-labelledby="update-heading">
      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" dismissible onDismiss={() => setSuccess(false)}>
          Username updated successfully!
        </Alert>
      )}

      <FormField label="New Username" id="username" required>
        <Input
          type="text"
          id="username"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter new username"
          disabled={loading}
        />
      </FormField>

      <div className="update-form-actions">
        <Button 
          type="submit" 
          variant="primary" 
          loading={loading}
          disabled={!username.trim()}
        >
          Update Username
        </Button>
      </div>
    </form>
  );
}
