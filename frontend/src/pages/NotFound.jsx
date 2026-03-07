import { Link } from 'react-router-dom';
import { Button } from '../components/ui';

export default function NotFoundPage() {
  return (
    <div className="not-found-page">
      <div className="not-found-code">404</div>
      <h1>Page Not Found</h1>
      <p>
        Sorry, we couldn't find the page you're looking for. 
        It may have been moved or no longer exists.
      </p>
      <Link to="/">
        <Button variant="primary" size="lg">
          Return Home
        </Button>
      </Link>
    </div>
  );
}
