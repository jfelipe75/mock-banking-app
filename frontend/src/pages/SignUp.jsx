import { useContext, useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import CurrentUserContext from "../contexts/current-user-context";
import { registerUser } from "../adapters/auth-adapter";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";

export default function SignUpPage() {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useContext(CurrentUserContext);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  
  // Validation state
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  
  // Submission state
  const [errorText, setErrorText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  if (currentUser) return <Navigate to={`/users/${currentUser.id}`} />;

  // Password requirement checks
  const passwordChecks = {
    minLength: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasUppercase: /[A-Z]/.test(password),
  };

  const isPasswordValid = passwordChecks.minLength && passwordChecks.hasNumber && passwordChecks.hasUppercase;

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

  // Password validation
  const validatePassword = (value) => {
    if (!value) {
      setPasswordError('Password is required');
      return false;
    }
    if (value.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    }
    if (!/\d/.test(value)) {
      setPasswordError('Password must include at least one number');
      return false;
    }
    if (!/[A-Z]/.test(value)) {
      setPasswordError('Password must include at least one uppercase letter');
      return false;
    }
    setPasswordError('');
    return true;
  };

  // Confirm password validation
  const validateConfirmPassword = (value) => {
    if (!value) {
      setConfirmPasswordError('Please confirm your password');
      return false;
    }
    if (value !== password) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    }
    setConfirmPasswordError('');
    return true;
  };

  const handleEmailBlur = () => validateEmail(email);
  
  const handlePasswordBlur = () => {
    validatePassword(password);
    // Re-validate confirm password if it has a value
    if (confirmPassword) {
      validateConfirmPassword(confirmPassword);
    }
    // Keep requirements visible if password is invalid
    if (isPasswordValid) {
      setShowPasswordRequirements(false);
    }
  };

  const handleConfirmPasswordBlur = () => validateConfirmPassword(confirmPassword);

  const handlePasswordFocus = () => {
    setShowPasswordRequirements(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorText('');

    // Validate all fields
    const isEmailFieldValid = validateEmail(email);
    const isPasswordFieldValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

    if (!isEmailFieldValid || !isPasswordFieldValid || !isConfirmPasswordValid) return;

    // Prevent multiple submissions
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const [user, error] = await registerUser({ email, password });
      
      if (error) {
        setErrorText(error.message || 'Registration failed. Please try again.');
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
        <h1>Create Account</h1>
        <p className="subtitle">Join us and start banking securely</p>

        {errorText && (
          <div className="auth-error" role="alert" aria-live="polite">
            {errorText}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* Email Field */}
          <div className="form-group">
            <label htmlFor="signup-email">Email Address</label>
            <div className="input-wrapper">
              <input
                type="email"
                id="signup-email"
                name="email"
                autoComplete="email"
                autoFocus
                aria-label="Email address"
                aria-describedby={emailError ? "signup-email-error" : undefined}
                aria-invalid={!!emailError}
                className={emailError ? 'input-error' : ''}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleEmailBlur}
                disabled={isSubmitting}
              />
            </div>
            {emailError && (
              <span id="signup-email-error" className="field-error" role="alert">
                {emailError}
              </span>
            )}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="signup-password">Password</label>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="signup-password"
                name="password"
                autoComplete="new-password"
                aria-label="Password"
                aria-describedby="password-requirements signup-password-error"
                aria-invalid={!!passwordError}
                className={passwordError ? 'input-error' : ''}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={handlePasswordFocus}
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
              <span id="signup-password-error" className="field-error" role="alert">
                {passwordError}
              </span>
            )}
            
            {/* Password Requirements */}
            {showPasswordRequirements && (
              <div className="password-requirements" id="password-requirements" role="status">
                <p>Password must have:</p>
                <ul>
                  <li className={passwordChecks.minLength ? 'valid' : 'invalid'}>
                    At least 8 characters
                  </li>
                  <li className={passwordChecks.hasNumber ? 'valid' : 'invalid'}>
                    At least one number
                  </li>
                  <li className={passwordChecks.hasUppercase ? 'valid' : 'invalid'}>
                    At least one uppercase letter
                  </li>
                </ul>
              </div>
            )}

            {/* Password Strength Meter */}
            <PasswordStrengthMeter password={password} />
          </div>

          {/* Confirm Password Field */}
          <div className="form-group">
            <label htmlFor="signup-confirm-password">Confirm Password</label>
            <div className="input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="signup-confirm-password"
                name="confirmPassword"
                autoComplete="new-password"
                aria-label="Confirm password"
                aria-describedby={confirmPasswordError ? "signup-confirm-password-error" : undefined}
                aria-invalid={!!confirmPasswordError}
                className={confirmPasswordError ? 'input-error' : ''}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={handleConfirmPasswordBlur}
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {confirmPasswordError && (
              <span id="signup-confirm-password-error" className="field-error" role="alert">
                {confirmPasswordError}
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
            {isSubmitting ? 'Creating account...' : 'Create My Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
