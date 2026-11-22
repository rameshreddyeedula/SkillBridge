
import { Link } from "react-router-dom";
import { getUser } from "../api.js";

export default function JobCard({ job, hasApplied = false }) {
  const user = getUser();

  const role = (user?.role || "").toLowerCase();
  const isRecruiter = role === "recruiter" || role === "company";

  const jobType = job.job_type || job.type || "Full-time";

  const requiredSkills =
    job.required_skills || job.requiredSkills || [];

  return (
    <article className="job-card">
      <div className="job-card-top">
        <div className="company-icon">
          {job.company?.charAt(0)?.toUpperCase() || "S"}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {!isRecruiter && hasApplied && (
            <span
              className="applied-badge"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 10px",
                borderRadius: "20px",
                backgroundColor: "#dcfce7",
                color: "#15803d",
                fontSize: "12px",
                fontWeight: "600",
                whiteSpace: "nowrap",
              }}
            >
              ✓ Applied
            </span>
          )}

          <span className="job-type">{jobType}</span>
        </div>
      </div>

      <h3>{job.title}</h3>

      <p className="company-name">{job.company}</p>

      <div className="job-meta">
        <span>⌖ {job.location || "Remote"}</span>
        <span>◷ {job.experience || "Entry level"}</span>
      </div>

      <div className="job-skills">
        {requiredSkills.slice(0, 4).map((skill, index) => (
          <span key={`${skill}-${index}`}>{skill}</span>
        ))}
      </div>

      <Link className="job-card-link" to={`/jobs/${job.id}`}>
        {isRecruiter ? "View Job Details" : "Check Skill Match"}
        <span>→</span>
      </Link>
    </article>
  );
}
