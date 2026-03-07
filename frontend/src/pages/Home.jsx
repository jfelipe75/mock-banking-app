import { useContext } from 'react';
import { Link } from 'react-router-dom';
import CurrentUserContext from '../contexts/current-user-context';
import { Button } from '../components/ui';

export default function HomePage() {
  const { currentUser } = useContext(CurrentUserContext);

  return (
    <div className="home-page">
      <section className="home-hero">
        <h1>Welcome to SecureBank</h1>
        <p>
          Experience modern banking with enterprise-grade security. 
          Manage your finances with confidence using our secure, 
          intuitive platform.
        </p>
        <div className="home-actions">
          {currentUser ? (
            <Link to={`/users/${currentUser.id}`}>
              <Button variant="primary" size="lg">
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/sign-up">
                <Button variant="primary" size="lg">
                  Get Started
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" size="lg">
                  Sign In
                </Button>
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="home-features">
        <div className="feature-card">
          <div className="feature-icon">🔒</div>
          <h3>Bank-Grade Security</h3>
          <p>Your data is protected with industry-leading encryption and security protocols.</p>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">💳</div>
          <h3>Easy Transfers</h3>
          <p>Send and receive money instantly with our streamlined transfer system.</p>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h3>Real-Time Insights</h3>
          <p>Track your spending and monitor your accounts with detailed analytics.</p>
        </div>
      </section>

      <p className="security-badge">
        Your connection is secured with 256-bit encryption
      </p>
    </div>
  );
}
