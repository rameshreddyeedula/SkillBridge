
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, setSession, clearSession } from "../api.js";

export default function Login() {
  const navigate = useNavigate();

  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);
    clearSession();

    try {
      // Step 1: Prepare login form data.
      const formData = new URLSearchParams();

      formData.set("username", email.trim().toLowerCase());
      formData.set("password", password);

      // Step 2: Authenticate with FastAPI.
      const data = await api("/auth/login", {
        method: "POST",
        body: formData,
      });

      if (!data?.access_token) {
        throw new Error(
          "Backend did not return an access token."
        );
      }

      // Step 3: Temporarily save token.
      setSession(data.access_token, {
        email: email.trim().toLowerCase(),
      });

      // Step 4: Fetch authenticated user profile.
      const currentUser = await api("/auth/me");

      if (!currentUser?.id || !currentUser?.role) {
        throw new Error(
          "Unable to retrieve your account information."
        );
      }

      // Step 5: Validate account role.
      if (currentUser.role !== role) {
        throw new Error(
          `This account is registered as ${currentUser.role}. Please select the correct role.`
        );
      }

      // Step 6: Save complete session.
      const sessionUser = {
        ...currentUser,
        company: currentUser.company || "",
      };

      setSession(data.access_token, sessionUser);

      // Step 7: Redirect according to actual account role.
      if (sessionUser.role === "student") {
        navigate("/student-dashboard", {
          replace: true,
        });
      } else if (sessionUser.role === "recruiter") {
        navigate("/recruiter-dashboard", {
          replace: true,
        });
      } else {
        clearSession();
        throw new Error("Unsupported account role.");
      }

    } catch (err) {
      clearSession();

      console.error("SkillBridge login error:", err);

      setError(
        err.message || "Unable to log in. Please try again."
      );

    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">

        <div className="eyebrow">
          WELCOME TO SKILLBRIDGE
        </div>

        <h1>Login to your account</h1>

        <p className="muted">
          Choose your workspace to continue.
        </p>

        {/* Role Selection */}
        <div className="role-picker">

          <button
            type="button"
            className={`role-option ${
              role === "student" ? "selected" : ""
            }`}
            onClick={() => {
              setRole("student");
              setError("");
            }}
            disabled={loading}
          >
            <span>🎓</span>
            <b>Student</b>
            <small>Find jobs and prepare</small>
          </button>

          <button
            type="button"
            className={`role-option ${
              role === "recruiter" ? "selected" : ""
            }`}
            onClick={() => {
              setRole("recruiter");
              setError("");
            }}
            disabled={loading}
          >
            <span>🏢</span>
            <b>Recruiter</b>
            <small>Post jobs and hire</small>
          </button>

        </div>

        {/* Login Form */}
        <form
          className="form-stack"
          onSubmit={submit}
        >

          <label>
            Email address

            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="you@example.com"
              disabled={loading}
            />
          </label>

          <label>
            Password

            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter your password"
              disabled={loading}
            />
          </label>

          {error && (
            <p
              className="error-box"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            className="button button-full"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : `Login as ${
                  role === "student"
                    ? "Student"
                    : "Recruiter"
                }`}
          </button>

        </form>

        <p className="auth-bottom">
          Don't have an account?{" "}
          <Link to="/register">
            Create an account
          </Link>
        </p>

      </section>
    </main>
  );
}
