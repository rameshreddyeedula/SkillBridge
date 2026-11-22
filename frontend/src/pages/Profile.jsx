
import { useState } from "react";
import { Navigate } from "react-router-dom";

export default function Profile() {
  const user = JSON.parse(
    localStorage.getItem("skillbridge_user") || "null"
  );

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const storageKey = `skillbridge_profile_${user.email}`;

  const [profile, setProfile] = useState(() =>
    JSON.parse(localStorage.getItem(storageKey) || "{}")
  );

  const [message, setMessage] = useState("");

  function update(event) {
    setProfile((previous) => ({
      ...previous,
      [event.target.name]: event.target.value
    }));
  }

  function save(event) {
    event.preventDefault();

    localStorage.setItem(storageKey, JSON.stringify(profile));
    setMessage("Your profile has been saved.");
  }

  return (
    <main className="page-wrap narrow-page">
      <div className="page-heading">
        <div className="eyebrow">YOUR PROFESSIONAL IDENTITY</div>
        <h1>My Profile</h1>
        <p>
          Help recruiters understand your education, skills, and career goals.
        </p>
      </div>

      <section className="panel profile-header">
        <div className="profile-avatar">
          {user.name.charAt(0).toUpperCase()}
        </div>

        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <span className="status-pill">{user.role}</span>
        </div>
      </section>

      <form className="panel form-stack" onSubmit={save}>
        <h2>Profile information</h2>

        <label>
          Full name
          <input value={user.name} disabled />
        </label>

        <label>
          Email address
          <input value={user.email} disabled />
        </label>

        <label>
          Phone number
          <input
            name="phone"
            value={profile.phone || ""}
            onChange={update}
            placeholder="Enter your phone number"
          />
        </label>

        <label>
          Location
          <input
            name="location"
            value={profile.location || ""}
            onChange={update}
            placeholder="City, state"
          />
        </label>

        <label>
          Education
          <input
            name="education"
            value={profile.education || ""}
            onChange={update}
            placeholder="Degree and college"
          />
        </label>

        <label>
          Skills
          <textarea
            name="skills"
            rows={4}
            value={profile.skills || ""}
            onChange={update}
            placeholder="React, JavaScript, HTML, CSS..."
          />
        </label>

        <label>
          Career objective
          <textarea
            name="objective"
            rows={4}
            value={profile.objective || ""}
            onChange={update}
            placeholder="Describe the role you want and your career goals."
          />
        </label>

        {message && <p className="notice">{message}</p>}

        <button className="button button-full" type="submit">
          Save Profile
        </button>
      </form>
    </main>
  );
}
