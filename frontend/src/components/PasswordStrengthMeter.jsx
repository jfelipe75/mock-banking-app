import { useMemo } from 'react';

/**
 * Password Strength Meter Component
 * 
 * Evaluates password strength based on multiple criteria and displays
 * a visual progress bar with feedback suggestions.
 * 
 * @param {Object} props
 * @param {string} props.password - The password to evaluate
 */
export default function PasswordStrengthMeter({ password }) {
  // Calculate password strength
  const strengthData = useMemo(() => {
    if (!password) {
      return { score: 0, level: '', percentage: 0, suggestions: [] };
    }

    let score = 0;
    const suggestions = [];

    // Check criteria
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);
    const length = password.length;

    // Score based on length
    if (length >= 8) score += 1;
    if (length >= 12) score += 1;
    if (length >= 16) score += 1;

    // Score based on character types
    if (hasLowercase) score += 1;
    if (hasUppercase) score += 1;
    if (hasNumber) score += 1;
    if (hasSpecial) score += 1;

    // Generate suggestions
    if (length < 8) {
      suggestions.push('Use at least 8 characters');
    } else if (length < 12) {
      suggestions.push('Use 12+ characters for better security');
    }

    if (!hasUppercase) {
      suggestions.push('Add uppercase letters');
    }

    if (!hasLowercase) {
      suggestions.push('Add lowercase letters');
    }

    if (!hasNumber) {
      suggestions.push('Add numbers to strengthen');
    }

    if (!hasSpecial) {
      suggestions.push('Use special characters (!@#$%)');
    }

    // Determine strength level
    let level, percentage;
    if (score <= 2) {
      level = 'very-weak';
      percentage = 20;
    } else if (score <= 3) {
      level = 'weak';
      percentage = 40;
    } else if (score <= 4) {
      level = 'medium';
      percentage = 60;
    } else if (score <= 5) {
      level = 'strong';
      percentage = 80;
    } else {
      level = 'very-strong';
      percentage = 100;
    }

    return { score, level, percentage, suggestions };
  }, [password]);

  // Don't render if no password
  if (!password) {
    return null;
  }

  const levelLabels = {
    'very-weak': 'Very Weak',
    'weak': 'Weak',
    'medium': 'Medium',
    'strong': 'Strong',
    'very-strong': 'Very Strong',
  };

  return (
    <div className="password-strength-meter" aria-live="polite">
      {/* Strength Label */}
      <div className="strength-header">
        <span className="strength-label">Strength:</span>
        <span className={`strength-value strength-${strengthData.level}`}>
          {levelLabels[strengthData.level]}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="strength-bar-container" role="progressbar" aria-valuenow={strengthData.percentage} aria-valuemin="0" aria-valuemax="100" aria-label={`Password strength: ${levelLabels[strengthData.level]}`}>
        <div 
          className={`strength-bar strength-bar-${strengthData.level}`}
          style={{ width: `${strengthData.percentage}%` }}
        />
      </div>

      {/* Suggestions */}
      {strengthData.suggestions.length > 0 && (
        <p className="strength-suggestion">
          💡 {strengthData.suggestions[0]}
        </p>
      )}
    </div>
  );
}
