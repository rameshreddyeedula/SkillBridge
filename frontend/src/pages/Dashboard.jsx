
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import JobCard from "../components/JobCard.jsx";
import { api } from "../api.js";

export default function Dashboard() {
  const user = JSON.parse(
    localStorage.getItem("skillbridge_user") || "null"
  );

  const [myApplications, setMyApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [applicationsError, setApplicationsError] = useState("");

  const [backendJobs, setBackendJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState("");

  const isRecruiter = user?.role === "recruiter";

  // Fetch backend jobs.
  useEffect(() => {
    let active = true;

    async function fetchJobs() {
      if (!user) {
        setJobsLoading(false);
        return;
      }

      try {
        setJobsLoading(true);
        setJobsError("");

        const endpoint = isRecruiter ? "/recruiter/jobs" : "/jobs";
        const data = await api(endpoint);

        if (active) {
          setBackendJobs(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (active) {
          setJobsError(error.message || "Unable to load jobs.");
        }
      } finally {
        if (active) {
          setJobsLoading(false);
        }
      }
    }

    fetchJobs();

    return () => {
      active = false;
    };
  }, [user?.id, user?.email, user?.role, isRecruiter]);

  // Fetch student applications.
  useEffect(() => {
    let active = true;

    async function fetchMyApplications() {
      if (!user || user.role !== "student") {
        setApplicationsLoading(false);
        return;
      }

      try {
        setApplicationsLoading(true);
        setApplicationsError("");

        const data = await api("/applications/mine");

        if (active) {
          const applications = Array.isArray(data)
            ? data
            : data?.applications || [];

          setMyApplications(applications);
        }
      } catch (error) {
        if (active) {
          setApplicationsError(
            error.message || "Unable to load your applications."
          );
        }
      } finally {
        if (active) {
          setApplicationsLoading(false);
        }
      }
    }

    fetchMyApplications();

    return () => {
      active = false;
    };
  }, [user?.id, user?.email, user?.role]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Only backend jobs are displayed.
  const allJobs = useMemo(() => {
    return backendJobs;
  }, [backendJobs]);

  const myJobs = isRecruiter ? backendJobs : [];

  const profile = JSON.parse(
    localStorage.getItem(`skillbridge_profile_${user.email}`) || "{}"
  );

  const profileFields = [
    user.name,
    user.email,
    profile.phone,
    profile.location,
    profile.education,
    profile.skills
  ];

  const completedFields = profileFields.filter(Boolean).length;

  const profileCompletion = Math.round(
    (completedFields / profileFields.length) * 100
  );

  return (
    <main className="page-wrap">
      <div className="dashboard-welcome">
        <div>
          <div className="eyebrow">
            {isRecruiter
              ? "COMPANY WORKSPACE"
              : "YOUR CAREER WORKSPACE"}
          </div>

          <h1>
            Welcome, {user.name.split(" ")[0]}!
          </h1>

          <p>
            {isRecruiter
              ? "Manage your vacancies and discover candidates."
              : "Discover opportunities, strengthen your skills, and prepare for interviews."}
          </p>
        </div>

        <span className="role-badge">
          {isRecruiter ? "Recruiter" : "Student"}
        </span>
      </div>

      {isRecruiter ? (
        <>
          <section className="dashboard-grid">
            <article className="panel">
              <div className="feature-icon">＋</div>
              <h2>Post a new job</h2>
              <p>
                Publish a vacancy with required and mandatory skills.
              </p>
              <Link to="/post-job" className="button">
                Create Job
              </Link>
            </article>

            <article className="panel">
              <div className="feature-icon">▤</div>
              <h2>My published jobs</h2>
              <p>
                {jobsLoading
                  ? "Loading your jobs..."
                  : `You have published ${myJobs.length} jobs.`}
              </p>
              <a href="#my-jobs" className="button button-outline">
                Manage Jobs
              </a>
            </article>

            <article className="panel">
              <div className="feature-icon">♙</div>
              <h2>Applications</h2>
              <p>
                Review applications submitted by students.
              </p>
              <Link to="/applications" className="button button-outline">
                View Applications
              </Link>
            </article>
          </section>

          <section id="my-jobs">
            <div className="section-heading">
              <h2>Your published jobs</h2>
              <Link to="/post-job" className="text-link">
                + Post another job
              </Link>
            </div>

            {jobsLoading ? (
              <p className="muted">Loading your published jobs...</p>
            ) : jobsError ? (
              <div className="error-message" role="alert">
                {jobsError}
              </div>
            ) : myJobs.length === 0 ? (
              <div className="empty-state">
                <h3>No jobs published yet</h3>
                <p>
                  Publish your first job to make it available to students.
                </p>
                <Link to="/post-job" className="button">
                  Post Your First Job
                </Link>
              </div>
            ) : (
              <div className="jobs-grid">
                {myJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="student-layout">
          <aside className="panel student-profile">
            <div className="profile-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>

            <h2>{user.name}</h2>
            <p>{user.email}</p>
            <span className="status-pill">Student profile</span>

            <div className="profile-progress">
              <div className="progress-label">
                <span>Profile completion</span>
                <strong>{profileCompletion}%</strong>
              </div>

              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>
            </div>

            <Link
              to="/profile"
              className="button button-outline button-full"
            >
              View / Edit Profile
            </Link>

            <Link to="/applications" className="profile-link">
              My Applications →
            </Link>

            <Link to="/preparation" className="profile-link">
              Interview Preparation →
            </Link>
          </aside>

          <div className="student-main">
            <section className="dashboard-grid student-stats">
              <article className="panel">
                <span className="muted">Available jobs</span>
                <h2>
                  {jobsLoading ? "..." : allJobs.length}
                </h2>
                <Link to="/jobs" className="text-link">
                  Explore jobs →
                </Link>
              </article>

              <article className="panel">
                <span className="muted">My applications</span>

                <h2>
                  {applicationsLoading
                    ? "..."
                    : applicationsError
                      ? "—"
                      : myApplications.length}
                </h2>

                {applicationsError ? (
                  <p className="error-message">
                    {applicationsError}
                  </p>
                ) : (
                  <Link to="/applications" className="text-link">
                    Track status →
                  </Link>
                )}
              </article>
            </section>

            <div className="section-heading">
              <div>
                <div className="eyebrow">OPPORTUNITIES FOR YOU</div>
                <h2>Latest job listings</h2>
              </div>

              <Link to="/jobs" className="text-link">
                View all →
              </Link>
            </div>

            {jobsLoading ? (
              <p className="muted">Loading latest jobs...</p>
            ) : jobsError ? (
              <div className="error-message" role="alert">
                {jobsError}
              </div>
            ) : allJobs.length > 0 ? (
              <div className="jobs-grid">
                {allJobs.map((job, index) => {
                  const hasApplied = myApplications.some(
                    (application) =>
                      Number(
                        application.job_id ??
                        application.jobId ??
                        application.job?.id
                      ) === Number(job.id)
                  );

                  return (
                    <JobCard
                      key={`${job.id}-${index}`}
                      job={job}
                      hasApplied={hasApplied}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                No jobs have been published yet.
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
