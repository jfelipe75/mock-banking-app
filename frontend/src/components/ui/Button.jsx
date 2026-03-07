import PropTypes from 'prop-types';

/**
 * Reusable Button component with consistent fintech styling
 * 
 * @param {Object} props
 * @param {string} [props.variant='primary'] - 'primary' | 'secondary' | 'danger' | 'ghost'
 * @param {string} [props.size='md'] - 'sm' | 'md' | 'lg'
 * @param {boolean} [props.fullWidth=false] - Whether button spans full width
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {boolean} [props.loading=false] - Loading state (shows spinner)
 * @param {string} [props.type='button'] - Button type attribute
 * @param {React.ReactNode} props.children - Button content
 * @param {function} [props.onClick] - Click handler
 * @param {string} [props.className] - Additional CSS classes
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  type = 'button',
  children,
  onClick,
  className = '',
  ...props
}) {
  const baseClass = 'btn';
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;
  const widthClass = fullWidth ? 'btn-full-width' : '';
  const loadingClass = loading ? 'btn-loading' : '';

  const combinedClasses = [
    baseClass,
    variantClass,
    sizeClass,
    widthClass,
    loadingClass,
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={combinedClasses}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      <span className={loading ? 'btn-text-loading' : ''}>{children}</span>
    </button>
  );
}

Button.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'ghost']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  className: PropTypes.string,
};
