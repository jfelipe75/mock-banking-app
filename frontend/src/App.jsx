import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SignUpPage from './pages/SignUp';
import LoginPage from './pages/Login';
import SiteHeadingAndNav from './components/SiteHeadingAndNav';
import NotFoundPage from './pages/NotFound';
import UsersPage from './pages/Users';
import UserPage from './pages/User';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return <>
    <SiteHeadingAndNav />
    <main>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/login' element={<LoginPage />} />
        <Route path='/sign-up' element={<SignUpPage />} />
        <Route path='/users' element={
          <ProtectedRoute>
            <UsersPage />
          </ProtectedRoute>
        } />
        <Route path='/users/:id' element={
          <ProtectedRoute>
            <UserPage />
          </ProtectedRoute>
        } />
        <Route path='*' element={<NotFoundPage />} />
      </Routes>
    </main>
  </>;
}
