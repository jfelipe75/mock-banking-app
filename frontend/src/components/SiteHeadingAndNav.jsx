import { NavLink } from "react-router-dom";
import { useContext } from "react";
import CurrentUserContext from "../contexts/current-user-context";
import LogoutButton from "./LogoutButton";

export default function SiteHeadingAndNav() {
  const { currentUser, clearUserState } = useContext(CurrentUserContext);

  return (
    <header>
      <a id='logo' href='/'>Revix</a>
      <nav>
        <ul>
          <li><NavLink to='/'>Home</NavLink></li>

          {currentUser ? (
            <>
              <li><NavLink to='/users' end={true}>Users</NavLink></li>
              <li><NavLink to={`/users/${currentUser.id}`}>{currentUser.username}</NavLink></li>
              <li><LogoutButton onLogout={clearUserState} /></li>
            </>
          ) : (
            <>
              <li><NavLink to='/login'>Login</NavLink></li>
              <li><NavLink to='/sign-up'>Sign Up</NavLink></li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
}
