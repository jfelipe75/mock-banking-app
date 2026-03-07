import PropTypes from 'prop-types';

/**
 * Reusable Alert component for displaying messages
 * 
 * @param {Object} props
 * @param {string} [props.variant='info'] - 'info' | 'success' | 'warning' | 'error'
 * @param {React.ReactNode} props.children - Alert content
 * @param {string} [props.title] - Optional title
 * @param {boolean} [props.dismissible=false] - Show dismiss button
 * @param {function} [props.onDismiss] - Dismiss handler
 * @param {string} [props.className] - Additional CSS classes
 */
export default function Alert({
  variant = 'info',
  children,
  title,
  dismissible = false,
  onDismiss,
  className = '',
  ...props
}) {
  const baseClass = 'alert';
  const variantClass = `alert-${variant}`;

  const combinedClasses = [baseClass, variantClass, className]
    .filter(Boolean)
    .join(' ');

  const iconMap = {
    info: 'ℹ️',
    success: '✓',
    warning: '⚠',
    error: '✕',
  };

  return (
    <div className={combinedClasses} role="alert" {...props}>
      <span className="alert-icon" aria-hidden="true">
        {iconMap[variant]}
      </span>
      <div className="alert-content">
        {title && <p className="alert-title">{title}</p>}
        <p className="alert-message">{children}</p>
      </div>
      {dismissible && (
        <button
          type="button"
          className="alert-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss alert"
        >
          ×
        </button>
      )}
    </div>
  );
}

Alert.propTypes = {
  variant: PropTypes.oneOf(['info', 'success', 'warning', 'error']),
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  dismissible: PropTypes.bool,
  onDismiss: PropTypes.func,
  className: PropTypes.string,
};
