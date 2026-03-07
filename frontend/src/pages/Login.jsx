import { useContext, useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { logUserIn } from "../adapters/auth-adapter";
import CurrentUserContext from "../contexts/current-user-context";

export default function LoginPage() {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useContext(CurrentUserContext);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Validation state
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Submission state
  const [errorText, setErrorText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  if (currentUser) return <Navigate to={`/users/${currentUser.id}`} />;

  // Email validation
  const validateEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  // Password validation (basic for login)
  const validatePassword = (value) => {
    if (!value) {
      setPasswordError('Password is required');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleEmailBlur = () => validateEmail(email);
  const handlePasswordBlur = () => validatePassword(password);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorText('');

    // Validate all fields
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) return;

    // Prevent multiple submissions
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const [user, error] = await logUserIn({ email, password });
      
      if (error) {
        setErrorText(error.message || 'Invalid email or password. Please try again.');
        return;
      }

      setCurrentUser(user);
      navigate(`/users/${user.id}`);
    } catch (err) {
      setErrorText('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Welcome Back</h1>
        <p className="subtitle">Sign in to access your account</p>

        {errorText && (
          <div className="auth-error" role="alert" aria-live="polite">
            {errorText}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* Email Field */}
          <div className="form-group">
            <label htmlFor="login-email">Email Address</label>
            <div className="input-wrapper">
              <input
                type="email"
                id="login-email"
                name="email"
                autoComplete="email"
                autoFocus
                aria-label="Email address"
                aria-describedby={emailError ? "email-error" : undefined}
                aria-invalid={!!emailError}
                className={emailError ? 'input-error' : ''}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleEmailBlur}
                disabled={isSubmitting}
              />
            </div>
            {emailError && (
              <span id="email-error" className="field-error" role="alert">
                {emailError}
              </span>
            )}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="login-password"
                name="password"
                autoComplete="current-password"
                aria-label="Password"
                aria-describedby={passwordError ? "password-error" : undefined}
                aria-invalid={!!passwordError}
                className={passwordError ? 'input-error' : ''}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={handlePasswordBlur}
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {passwordError && (
              <span id="password-error" className="field-error" role="alert">
                {passwordError}
              </span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Access My Account'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/sign-up">Create one here</Link>
        </p>
      </div>
    </div>
  );
}
