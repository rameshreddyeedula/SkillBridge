
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Navbar from "./components/Navbar.jsx";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import RecruiterDashboard from "./pages/RecruiterDashboard.jsx";

import JobSearch from "./pages/JobSearch.jsx";
import JobDetails from "./pages/JobDetails.jsx";
import PostJob from "./pages/PostJob.jsx";

import Applications from "./pages/Applications.jsx";
import Preparation from "./pages/Preparation.jsx";
import Profile from "./pages/Profile.jsx";

import "./App.css";


// --------------------------------------------------
// USER SESSION
// --------------------------------------------------

function getCurrentUser() {
  try {
    return JSON.parse(
      localStorage.getItem("skillbridge_user") || "null"
    );
  } catch {
    return null;
  }
}


// --------------------------------------------------
// ROLE-BASED DASHBOARD REDIRECT
// --------------------------------------------------

function getDashboardPath(user) {
  if (user?.role === "student") {
    return "/student-dashboard";
  }

  if (user?.role === "recruiter") {
    return "/recruiter-dashboard";
  }

  return "/";
}


// --------------------------------------------------
// AUTHENTICATION PROTECTION
// --------------------------------------------------

function RequireAuth({ children, roles }) {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <Navigate
        to={getDashboardPath(user)}
        replace
      />
    );
  }

  return children;
}


// --------------------------------------------------
// PUBLIC ROUTE PROTECTION
// --------------------------------------------------

function PublicOnly({ children }) {
  const user = getCurrentUser();

  if (user) {
    return (
      <Navigate
        to={getDashboardPath(user)}
        replace
      />
    );
  }

  return children;
}


// --------------------------------------------------
// MAIN APPLICATION
// --------------------------------------------------

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>

        {/* -----------------------------------------
            PUBLIC PAGES
        ----------------------------------------- */}

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/login"
          element={
            <PublicOnly>
              <Login />
            </PublicOnly>
          }
        />

        <Route
          path="/register"
          element={
            <PublicOnly>
              <Register />
            </PublicOnly>
          }
        />


        {/* -----------------------------------------
            JOB PAGES
        ----------------------------------------- */}

        <Route
          path="/jobs"
          element={<JobSearch />}
        />

        <Route
          path="/jobs/:jobId"
          element={<JobDetails />}
        />


        {/* -----------------------------------------
            GENERAL DASHBOARD
        ----------------------------------------- */}

        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />


        {/* -----------------------------------------
            STUDENT DASHBOARD
        ----------------------------------------- */}

        <Route
          path="/student-dashboard"
          element={
            <RequireAuth roles={["student"]}>
              <StudentDashboard />
            </RequireAuth>
          }
        />


        {/* -----------------------------------------
            RECRUITER DASHBOARD
        ----------------------------------------- */}

        <Route
          path="/recruiter-dashboard"
          element={
            <RequireAuth roles={["recruiter"]}>
              <RecruiterDashboard />
            </RequireAuth>
          }
        />


        {/* -----------------------------------------
            RECRUITER: POST JOB
        ----------------------------------------- */}

        <Route
          path="/post-job"
          element={
            <RequireAuth roles={["recruiter"]}>
              <PostJob />
            </RequireAuth>
          }
        />


        {/* -----------------------------------------
            APPLICATIONS
            Student: Track own applications
            Recruiter: Review received applications
        ----------------------------------------- */}

        <Route
          path="/applications"
          element={
            <RequireAuth
              roles={["student", "recruiter"]}
            >
              <Applications />
            </RequireAuth>
          }
        />


        {/* -----------------------------------------
            STUDENT: INTERVIEW PREPARATION
        ----------------------------------------- */}

        <Route
          path="/preparation"
          element={
            <RequireAuth roles={["student"]}>
              <Preparation />
            </RequireAuth>
          }
        />


        {/* -----------------------------------------
            USER PROFILE
        ----------------------------------------- */}

        <Route
          path="/profile"
          element={
            <RequireAuth
              roles={["student", "recruiter"]}
            >
              <Profile />
            </RequireAuth>
          }
        />


        {/* -----------------------------------------
            INVALID ROUTES
        ----------------------------------------- */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>


      {/* -----------------------------------------
          FOOTER
      ----------------------------------------- */}

      <footer className="footer">
        SkillBridge · Discover jobs. Close skill gaps.
        Prepare with confidence.
      </footer>

    </BrowserRouter>
  );
}
