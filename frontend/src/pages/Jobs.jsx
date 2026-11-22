
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, getUser } from "../api.js";

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [appliedJobIds, setAppliedJobIds] = useState([]);

  const user = getUser();

  const isStudent = ["student", "jobseeker"].includes(
    String(user?.role || "").trim().toLowerCase()
  );

  // LOAD JOBS
  useEffect(() => {
    let active = true;

    async function loadJobs() {
      try {
        setLoading(true);
        setError("");

        const data = await api("/jobs");

        console.log("JOBS API RESPONSE:", data);

        if (active) {
          setJobs(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (active) {
          setError(
            err.message ||
              "Unable to load jobs. Check that the backend is running."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadJobs();

    return () => {
      active = false;
    };
  }, []);

  // LOAD STUDENT APPLICATIONS
  useEffect(() => {
    let active = true;

    async function loadApplications() {
      if (!isStudent) {
        setAppliedJobIds([]);
        console.log("Current user is not detected as a student:", user);
        return;
      }

      try {
        const data = await api("/applications/mine");

        console.log("APPLICATION API RESPONSE:", data);

        const applications = Array.isArray(data)
          ? data
          : data?.applications ||
            data?.items ||
            data?.data ||
            [];

        console.log("APPLICATION LIST:", applications);
        console.log("CURRENT USER:", user);

        if (active) {
          const appliedIds = applications
            .map((application) => {
              const id =
                application.job_id ??
                application.jobId ??
                application.job?.id ??
                application.job?.job_id;

              return Number(id);
            })
            .filter((id) => Number.isFinite(id) && id > 0);

          console.log("EXTRACTED APPLIED JOB IDS:", appliedIds);

          setAppliedJobIds([...new Set(appliedIds)]);
        }
      } catch (err) {
        console.error("Unable to load application status:", err);
      }
    }

    loadApplications();

    return () => {
      active = false;
    };
  }, [isStudent]);

  // SEARCH FILTER
  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return jobs;
    }

    return jobs.filter((job) => {
      const searchableText = [
        job.title,
        job.company,
        job.location,
        job.job_type,
        job.experience,
        job.description,
        ...(job.required_skills || []),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [jobs, search]);

  return (
    <main className="page-container">
      <section className="page-heading">
        <p className="eyebrow">FIND YOUR NEXT OPPORTUNITY</p>
        <h1>Explore Jobs</h1>
        <p>
          Discover opportunities and check how well your skills
          match each position.
        </p>
      </section>

      <div className="jobs-search">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by job title, company or skill"
          aria-label="Search jobs"
        />
      </div>

      {loading && <p role="status">Loading jobs...</p>}

      {!loading && error && (
        <section className="error-message" role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </section>
      )}

      {!loading && !error && jobs.length === 0 && (
        <section className="empty-state">
          <h2>No jobs published yet</h2>
          <p>
            Recruiters can publish a job to make it available to
            students here.
          </p>
        </section>
      )}

      {!loading &&
        !error &&
        jobs.length > 0 &&
        filteredJobs.length === 0 && (
          <section className="empty-state">
            <h2>No matching jobs</h2>
            <p>Try a different job title, company or skill.</p>
          </section>
        )}

      {!loading && !error && filteredJobs.length > 0 && (
        <section className="jobs-grid">
          {filteredJobs.map((job) => {
            const hasApplied =
              isStudent &&
              appliedJobIds.includes(Number(job.id));

            console.log("JOB:", job.id, job.title);
            console.log("APPLIED JOB IDS:", appliedJobIds);
            console.log("HAS APPLIED:", hasApplied);

            return (
              <article className="job-card" key={job.id}>
                <div className="job-card-header">
                  <div>
                    <h2>{job.title}</h2>
                    <p>{job.company}</p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: "8px",
                      flexShrink: 0,
                    }}
                  >
                    {hasApplied && (
                      <span
                        className="applied-badge"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "6px 12px",
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

                    <span className="job-type">
                      {job.job_type}
                    </span>
                  </div>
                </div>

                <div className="job-meta">
                  <span>{job.location}</span>
                  <span>{job.experience}</span>
                </div>

                <p className="job-description">
                  {job.description}
                </p>

                <div className="job-skills">
                  {(job.required_skills || []).map((skill) => (
                    <span key={skill} className="skill-tag">
                      {skill}
                    </span>
                  ))}
                </div>

                <Link
                  className="button"
                  to={`/jobs/${job.id}`}
                >
                  View Details
                </Link>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
