import PropTypes from 'prop-types';

/**
 * Reusable Card component for consistent container styling
 * 
 * @param {Object} props
 * @param {string} [props.variant='default'] - 'default' | 'elevated' | 'outlined'
 * @param {string} [props.padding='md'] - 'none' | 'sm' | 'md' | 'lg'
 * @param {React.ReactNode} props.children - Card content
 * @param {string} [props.className] - Additional CSS classes
 */
export default function Card({
  variant = 'default',
  padding = 'md',
  children,
  className = '',
  ...props
}) {
  const baseClass = 'card';
  const variantClass = `card-${variant}`;
  const paddingClass = `card-padding-${padding}`;

  const combinedClasses = [baseClass, variantClass, paddingClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={combinedClasses} {...props}>
      {children}
    </div>
  );
}

Card.propTypes = {
  variant: PropTypes.oneOf(['default', 'elevated', 'outlined']),
  padding: PropTypes.oneOf(['none', 'sm', 'md', 'lg']),
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};
