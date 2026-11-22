
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getUser } from "../api.js";
import "./PostJob.css";

const initialForm = {
  title: "",
  company: "",
  location: "Remote",
  type: "Full-time",
  experience: "Entry level",
  description: "",
  requiredSkills: "",
  mandatorySkills: "",
};

function splitSkills(value) {
  return [
    ...new Set(
      value.split(",").map((skill) => skill.trim()).filter(Boolean)
    ),
  ];
}

export default function PostJob() {
  const navigate = useNavigate();
  const user = getUser();

  const [form, setForm] = useState({
    ...initialForm,
    company: user?.company || "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!user) {
    return (
      <main className="post-job-page">
        <section className="post-job-card access-message">
          <h2>Please log in to continue</h2>
          <Link to="/login" className="post-job-back-link">
            Go to Login
          </Link>
        </section>
      </main>
    );
  }

  if (!["recruiter", "company"].includes(user.role?.toLowerCase())) {
    return (
      <main className="post-job-page">
        <section className="post-job-card access-message">
          <h2>Recruiter access required</h2>
          <p>Only recruiters can publish job openings.</p>
          <Link to="/jobs" className="post-job-back-link">
            Browse Jobs
          </Link>
        </section>
      </main>
    );
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setSuccess("");

    const requiredSkills = splitSkills(form.requiredSkills);
    const mandatorySkills = splitSkills(form.mandatorySkills);

    if (!form.title.trim() || !form.company.trim()) {
      setError("Please enter the job title and company name.");
      return;
    }

    if (form.description.trim().length < 10) {
      setError("Job description must contain at least 10 characters.");
      return;
    }

    if (requiredSkills.length === 0) {
      setError("Enter at least one required skill.");
      return;
    }

    const invalidMandatorySkills = mandatorySkills.filter(
      (skill) =>
        !requiredSkills.some(
          (required) => required.toLowerCase() === skill.toLowerCase()
        )
    );

    if (invalidMandatorySkills.length > 0) {
      setError(
        "Every mandatory skill must also appear in Required Skills."
      );
      return;
    }

    setLoading(true);

    try {
      const createdJob = await api("/jobs", {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          company: form.company.trim(),
          location: form.location.trim() || "Remote",
          job_type: form.type,
          experience: form.experience,
          description: form.description.trim(),
          required_skills: requiredSkills,
          mandatory_skills: mandatorySkills,
        }),
      });

      setSuccess("Job published successfully!");

      navigate(`/jobs/${createdJob.id}`);
    } catch (err) {
      setError(err.message || "Unable to publish the job.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="post-job-page">
      <div className="post-job-container">
        <div className="post-job-top">
          <Link to="/dashboard" className="post-job-back-link">
            <span aria-hidden="true">←</span> Back to Dashboard
          </Link>

          <span className="post-job-portal">
            <span className="portal-dot" />
            Recruiter Portal
          </span>
        </div>

        <section className="post-job-card">
          <div className="post-job-heading">
            <div className="post-job-icon" aria-hidden="true">
              +
            </div>

            <p className="post-job-eyebrow">CREATE AN OPPORTUNITY</p>

            <h1>Post a New Job</h1>

            <p className="post-job-subtitle">
              Share an opportunity and find the right talent for your team.
            </p>
          </div>

          {error && (
            <div className="post-job-alert error" role="alert">
              <span>!</span>
              {error}
            </div>
          )}

          {success && (
            <div className="post-job-alert success" role="status">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="post-job-form">
            <div className="post-job-section-heading">
              <span>01</span>
              <div>
                <h2>Basic Information</h2>
                <p>Tell candidates about the position.</p>
              </div>
            </div>

            <div className="post-job-grid">
              <div className="post-job-field full-width">
                <label htmlFor="title">
                  Job Title <span>*</span>
                </label>

                <input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Junior React Developer"
                  minLength={2}
                  maxLength={180}
                  required
                />
              </div>

              <div className="post-job-field">
                <label htmlFor="company">
                  Company Name <span>*</span>
                </label>

                <input
                  id="company"
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  placeholder="Enter company name"
                  maxLength={180}
                  required
                />
              </div>

              <div className="post-job-field">
                <label htmlFor="location">Job Location</label>

                <input
                  id="location"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="Remote or Hyderabad"
                  maxLength={180}
                />
              </div>

              <div className="post-job-field">
                <label htmlFor="type">Employment Type</label>

                <select
                  id="type"
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                >
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Internship</option>
                  <option>Contract</option>
                </select>
              </div>

              <div className="post-job-field">
                <label htmlFor="experience">Experience Level</label>

                <select
                  id="experience"
                  name="experience"
                  value={form.experience}
                  onChange={handleChange}
                >
                  <option>Entry level</option>
                  <option>Fresher</option>
                  <option>0-1 years</option>
                  <option>1-2 years</option>
                  <option>2-3 years</option>
                  <option>Experienced</option>
                </select>
              </div>
            </div>

            <div className="post-job-divider" />

            <div className="post-job-section-heading">
              <span>02</span>
              <div>
                <h2>Job Description</h2>
                <p>Explain the role and its responsibilities.</p>
              </div>
            </div>

            <div className="post-job-field">
              <label htmlFor="description">
                Description <span>*</span>
              </label>

              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe the role, responsibilities, qualifications and what candidates can expect..."
                rows={7}
                minLength={10}
                required
              />

              <p className="post-job-help">
                Provide clear information so candidates understand the role.
              </p>
            </div>

            <div className="post-job-divider" />

            <div className="post-job-section-heading">
              <span>03</span>
              <div>
                <h2>Skills & Requirements</h2>
                <p>Define the skills needed for this position.</p>
              </div>
            </div>

            <div className="post-job-field">
              <label htmlFor="requiredSkills">
                Required Skills <span>*</span>
              </label>

              <input
                id="requiredSkills"
                name="requiredSkills"
                value={form.requiredSkills}
                onChange={handleChange}
                placeholder="React, JavaScript, HTML, CSS"
                required
              />

              <p className="post-job-help">
                Add all relevant skills separated by commas.
              </p>
            </div>

            <div className="post-job-field">
              <label htmlFor="mandatorySkills">
                Mandatory Skills
              </label>

              <input
                id="mandatorySkills"
                name="mandatorySkills"
                value={form.mandatorySkills}
                onChange={handleChange}
                placeholder="React, JavaScript"
              />

              <p className="post-job-help">
                Applicants must match every mandatory skill as well as
                meeting the overall 75% match threshold.
              </p>
            </div>

            <div className="post-job-submit-area">
              <p>
                Fields marked with <span>*</span> are required.
              </p>

              <button
                type="submit"
                className="post-job-submit"
                disabled={loading}
              >
                {loading ? (
                  "Publishing..."
                ) : (
                  <>
                    Publish Job <span aria-hidden="true">→</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        <p className="post-job-footer">
          Need to make changes?{" "}
          <Link to="/jobs">View available jobs</Link>
        </p>
      </div>
    </main>
  );
}
