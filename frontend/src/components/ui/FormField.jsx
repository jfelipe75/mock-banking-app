import PropTypes from 'prop-types';

/**
 * Reusable FormField component wrapping label, input, and error message
 * 
 * @param {Object} props
 * @param {string} props.label - Field label text
 * @param {string} props.id - Input id (used to associate label)
 * @param {string} [props.error] - Error message to display
 * @param {string} [props.hint] - Helper text below the input
 * @param {boolean} [props.required=false] - Show required indicator
 * @param {React.ReactNode} props.children - The input element
 * @param {string} [props.className] - Additional CSS classes
 */
export default function FormField({
  label,
  id,
  error,
  hint,
  required = false,
  children,
  className = '',
}) {
  const baseClass = 'form-field';
  const errorClass = error ? 'form-field-error' : '';

  const combinedClasses = [baseClass, errorClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={combinedClasses}>
      <label htmlFor={id} className="form-field-label">
        {label}
        {required && <span className="form-field-required" aria-hidden="true">*</span>}
      </label>
      
      <div className="form-field-input">
        {children}
      </div>
      
      {error && (
        <p className="form-field-error-text" role="alert" aria-live="polite">
          {error}
        </p>
      )}
      
      {hint && !error && (
        <p className="form-field-hint">{hint}</p>
      )}
    </div>
  );
}

FormField.propTypes = {
  label: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  error: PropTypes.string,
  hint: PropTypes.string,
  required: PropTypes.bool,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};
