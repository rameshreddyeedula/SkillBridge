
import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api, getUser } from "../api.js";

const STATUSES = [
  "Submitted",
  "Under Review",
  "Shortlisted",
  "Interview",
  "Rejected",
  "Accepted",
];

function getStatusClass(status) {
  const normalizedStatus = (status || "Submitted")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");

  return `status-${normalizedStatus}`;
}

export default function Applications() {
  const user = getUser();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [resumeLoadingId, setResumeLoadingId] = useState(null);

  const isRecruiter =
    user?.role === "recruiter" || user?.role === "company";

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadApplications() {
      try {
        setLoading(true);
        setError("");

        const endpoint = isRecruiter
          ? "/recruiter/applications"
          : "/applications/mine";

        const data = await api(endpoint);

        if (active) {
          setApplications(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load applications.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadApplications();

    return () => {
      active = false;
    };
  }, [user?.id, user?.role, isRecruiter]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Update application status.
  async function updateStatus(applicationId, status) {
    try {
      setUpdatingId(applicationId);
      setError("");

      await api(`/applications/${applicationId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setApplications((previous) =>
        previous.map((item) =>
          String(item.id) === String(applicationId)
            ? { ...item, status }
            : item
        )
      );
    } catch (err) {
      setError(err.message || "Unable to update application status.");
    } finally {
      setUpdatingId(null);
    }
  }

  // View applicant resume.
  async function viewResume(applicationId) {
    const previewWindow = window.open("", "_blank");

    try {
      setResumeLoadingId(applicationId);
      setError("");

      const fileBlob = await api(
        `/applications/${applicationId}/resume`
      );

      const fileUrl = URL.createObjectURL(fileBlob);

      if (previewWindow) {
        previewWindow.location.href = fileUrl;
      } else {
        const link = document.createElement("a");
        link.href = fileUrl;
        link.download = "applicant-resume";
        link.click();
      }

      setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
    } catch (err) {
      if (previewWindow) previewWindow.close();

      setError(err.message || "Unable to open applicant resume.");
    } finally {
      setResumeLoadingId(null);
    }
  }

  // Download applicant resume.
  async function downloadResume(applicationId, filename) {
    try {
      setResumeLoadingId(applicationId);
      setError("");

      const fileBlob = await api(
        `/applications/${applicationId}/resume`
      );

      const fileUrl = URL.createObjectURL(fileBlob);
      const link = document.createElement("a");

      link.href = fileUrl;
      link.download = filename || "applicant-resume";
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
    } catch (err) {
      setError(err.message || "Unable to download applicant resume.");
    } finally {
      setResumeLoadingId(null);
    }
  }

  function formatDate(value) {
    if (!value) return "—";

    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <main className="page-wrap">
      <div className="page-heading">
        <div className="eyebrow">
          {isRecruiter ? "RECRUITER WORKSPACE" : "YOUR JOB JOURNEY"}
        </div>

        <h1>
          {isRecruiter
            ? "Applications Received"
            : "My Applications"}
        </h1>

        <p>
          {isRecruiter
            ? "Review applicants, examine their skills and resumes, and manage application status."
            : "Track your submitted applications and check their status."}
        </p>
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="empty-state">
          <h2>Loading applications...</h2>
          <p>Please wait while we retrieve your applications.</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="empty-state">
          <h2>
            {isRecruiter
              ? "No applications received yet"
              : "No applications yet"}
          </h2>

          <p>
            {isRecruiter
              ? "Applications submitted for your published jobs will appear here."
              : "Explore available jobs and apply to see your applications here."}
          </p>

          <Link
            to={isRecruiter ? "/recruiter-dashboard" : "/jobs"}
            className="button"
          >
            {isRecruiter ? "Back to Dashboard" : "Explore Jobs"}
          </Link>
        </div>
      ) : (
        <section className="applications-list">
          <div className="section-heading">
            <h2>
              {isRecruiter
                ? `${applications.length} Applications Received`
                : `${applications.length} Applications Submitted`}
            </h2>
          </div>

          {applications.map((item) => {
            const currentStatus = item.status || "Submitted";
            const statusClass = getStatusClass(currentStatus);

            return (
              <article
                className="panel application-card"
                key={item.id}
              >
                <div className="application-header">
                  <div>
                    <div className="eyebrow">
                      {isRecruiter
                        ? "APPLICANT DETAILS"
                        : "JOB DETAILS"}
                    </div>

                    <h2>{item.job_title || "Job"}</h2>

                    <p>{item.company || "Company"}</p>
                  </div>
                </div>

                <div className="application-details">
                  {isRecruiter && (
                    <>
                      <div>
                        <strong>Candidate Name</strong>
                        <p>{item.student_name || "—"}</p>
                      </div>

                      <div>
                        <strong>Email Address</strong>
                        <p>{item.student_email || "—"}</p>
                      </div>
                    </>
                  )}

                  <div>
                    <strong>Applied Date</strong>
                    <p>{formatDate(item.created_at)}</p>
                  </div>

                  <div>
                    <strong>Match Percentage</strong>
                    <p>{item.match_percentage ?? 0}%</p>
                  </div>
                </div>

                {/* Recruiter-only applicant information */}
                {isRecruiter && (
                  <>
                    <div className="candidate-skills">
                      <h3>Candidate Skills</h3>

                      <div className="skill-tags">
                        {(item.candidate_skills || []).length > 0 ? (
                          item.candidate_skills.map((skill) => (
                            <span className="skill-tag" key={skill}>
                              {skill}
                            </span>
                          ))
                        ) : (
                          <p>No skills available.</p>
                        )}
                      </div>
                    </div>

                    <div className="candidate-skills">
                      <h3>Matched Skills</h3>

                      <div className="skill-tags">
                        {(item.matched_skills || []).map((skill) => (
                          <span
                            className="skill-tag matched"
                            key={skill}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="candidate-skills">
                      <h3>Skills to Prepare</h3>

                      <div className="skill-tags">
                        {(item.missing_skills || []).length > 0 ? (
                          item.missing_skills.map((skill) => (
                            <span
                              className="skill-tag missing"
                              key={skill}
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <p>No missing skills.</p>
                        )}
                      </div>
                    </div>

                    {/* Candidate resume */}
                    <div className="candidate-resume">
                      <h3>Candidate Resume</h3>

                      <p>
                        {item.resume_name ||
                          "Resume filename unavailable"}
                      </p>

                      <div className="resume-actions">
                        <button
                          type="button"
                          className="button"
                          disabled={resumeLoadingId === item.id}
                          onClick={() => viewResume(item.id)}
                        >
                          {resumeLoadingId === item.id
                            ? "Opening..."
                            : "View Resume"}
                        </button>

                        <button
                          type="button"
                          className="button button-outline"
                          disabled={resumeLoadingId === item.id}
                          onClick={() =>
                            downloadResume(item.id, item.resume_name)
                          }
                        >
                          Download Resume
                        </button>
                      </div>
                    </div>

                    {/* Recruiter updates status */}
                    <div className="application-status-update">
                      <label htmlFor={`status-${item.id}`}>
                        Update Application Status
                      </label>

                      <select
                        id={`status-${item.id}`}
                        value={currentStatus}
                        disabled={updatingId === item.id}
                        onChange={(event) =>
                          updateStatus(item.id, event.target.value)
                        }
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>

                      {updatingId === item.id && (
                        <small>Updating status...</small>
                      )}
                    </div>
                  </>
                )}

                {/* Student sees status only here */}
                {!isRecruiter && (
                  <div className="candidate-skills">
                    <h3>Application Status</h3>

                    <span
                      className={`application-status-badge ${statusClass}`}
                    >
                      {currentStatus}
                    </span>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
