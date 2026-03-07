import PropTypes from 'prop-types';
import SiteHeadingAndNav from '../SiteHeadingAndNav';

/**
 * AppLayout component - Main layout wrapper with header and navigation
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content
 */
export default function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <SiteHeadingAndNav />
      {children}
    </div>
  );
}

AppLayout.propTypes = {
  children: PropTypes.node.isRequired,
};
