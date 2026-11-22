
import { Link, NavLink, useNavigate } from "react-router-dom";

export default function Navbar() {
  const user = JSON.parse(
    localStorage.getItem("skillbridge_user") || "null"
  );

  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("skillbridge_user");
    localStorage.removeItem("skillbridge_token");
    navigate("/");
    window.location.reload();
  }

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        Skill<span>Bridge</span>
        <small>CAREER READINESS PLATFORM</small>
      </Link>

      <nav className="nav-links">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/jobs">Find Jobs</NavLink>

        {user && (
          <NavLink to="/dashboard">Dashboard</NavLink>
        )}

        {user?.role === "student" && (
          <NavLink to="/preparation">Preparation</NavLink>
        )}

        {user?.role === "recruiter" && (
          <NavLink to="/post-job">Post Job</NavLink>
        )}
      </nav>

      <div className="nav-actions">
        {user ? (
          <>
            <span className="user-label">{user.name}</span>
            <button
              className="button button-outline"
              onClick={logout}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="login-link">
              Login
            </Link>
            <Link to="/register" className="button">
              Get Started
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
