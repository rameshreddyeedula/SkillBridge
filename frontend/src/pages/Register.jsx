
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, setSession } from "../api.js";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    company: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  }

  function selectRole(role) {
    setForm((previous) => ({
      ...previous,
      role,
    }));

    setError("");
  }

  async function submit(event) {
    event.preventDefault();

    setError("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;
    const company = form.company.trim();

    // Basic validation
    if (name.length < 2) {
      setError("Name must contain at least 2 characters.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    // bcrypt supports a maximum of 72 UTF-8 bytes.
    if (new TextEncoder().encode(password).length > 72) {
      setError("Password must not exceed 72 UTF-8 bytes.");
      return;
    }

    if (form.role === "recruiter" && !company) {
      setError("Please enter your company name.");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Prepare registration payload.
      const payload = {
        name,
        email,
        password,
        role: form.role,
        company: form.role === "recruiter"
          ? company
          : null,
      };

      // Step 2: Register account in FastAPI.
      const result = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Step 3: If backend automatically returns a token,
      // authenticate the new session.
      if (result?.access_token) {
        setSession(result.access_token, {
          email,
          role: form.role,
        });

        // Get the actual user profile from the backend.
        const currentUser = await api("/auth/me");

        if (!currentUser?.id || !currentUser?.role) {
          throw new Error(
            "Account created, but unable to load your profile."
          );
        }

        if (currentUser.role !== form.role) {
          throw new Error(
            "The registered account role does not match."
          );
        }

        // Save complete user information.
        setSession(result.access_token, {
          ...currentUser,
          company: currentUser.company || "",
        });

        // Redirect according to account role.
        navigate(
          currentUser.role === "recruiter"
            ? "/recruiter-dashboard"
            : "/student-dashboard",
          { replace: true }
        );

      } else {
        // Registration succeeded without automatic login.
        navigate("/login", {
          replace: true,
          state: {
            email,
            role: form.role,
            message: "Account created successfully. Please log in.",
          },
        });
      }

    } catch (err) {
      console.error("SkillBridge registration error:", err);

      setError(
        err.message ||
        "Unable to create your account. Please try again."
      );

    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">

        <div className="eyebrow">
          JOIN SKILLBRIDGE
        </div>

        <h1>Create your account</h1>

        <p className="muted">
          Choose your role to get the right workspace.
        </p>

        <form
          className="form-stack"
          onSubmit={submit}
        >

          {/* Role Selection */}
          <div className="role-picker">

            <button
              type="button"
              className={`role-option ${
                form.role === "student" ? "selected" : ""
              }`}
              onClick={() => selectRole("student")}
              disabled={loading}
            >
              <span>🎓</span>
              <b>Student</b>
              <small>Find jobs and prepare</small>
            </button>

            <button
              type="button"
              className={`role-option ${
                form.role === "recruiter" ? "selected" : ""
              }`}
              onClick={() => selectRole("recruiter")}
              disabled={loading}
            >
              <span>🏢</span>
              <b>Recruiter</b>
              <small>Post jobs and hire</small>
            </button>

          </div>

          {/* Full Name */}
          <label>
            Full name

            <input
              type="text"
              name="name"
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
              value={form.name}
              onChange={update}
              placeholder="Your name"
              disabled={loading}
            />
          </label>

          {/* Recruiter Company */}
          {form.role === "recruiter" && (
            <label>
              Company name

              <input
                type="text"
                name="company"
                required
                maxLength={180}
                value={form.company}
                onChange={update}
                placeholder="Your company"
                disabled={loading}
              />
            </label>
          )}

          {/* Email */}
          <label>
            Email address

            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={update}
              placeholder="you@example.com"
              disabled={loading}
            />
          </label>

          {/* Password */}
          <label>
            Password

            <input
              type="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={update}
              placeholder="At least 8 characters"
              disabled={loading}
            />
          </label>

          {/* Error Message */}
          {error && (
            <p
              className="error-box"
              role="alert"
            >
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            className="button button-full"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Creating account..."
              : "Create Account"}
          </button>

        </form>

        <p className="auth-bottom">
          Already have an account?{" "}
          <Link to="/login">
            Login
          </Link>
        </p>

      </section>
    </main>
  );
}
