import PropTypes from 'prop-types';

/**
 * Reusable PageContainer component for consistent page layouts
 * 
 * @param {Object} props
 * @param {string} [props.size='md'] - 'sm' | 'md' | 'lg' | 'full'
 * @param {boolean} [props.centered=false] - Center content vertically
 * @param {React.ReactNode} props.children - Page content
 * @param {string} [props.className] - Additional CSS classes
 */
export default function PageContainer({
  size = 'md',
  centered = false,
  children,
  className = '',
  ...props
}) {
  const baseClass = 'page-container';
  const sizeClass = `page-container-${size}`;
  const centeredClass = centered ? 'page-container-centered' : '';

  const combinedClasses = [baseClass, sizeClass, centeredClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <main className={combinedClasses} {...props}>
      {children}
    </main>
  );
}

PageContainer.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'full']),
  centered: PropTypes.bool,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};
