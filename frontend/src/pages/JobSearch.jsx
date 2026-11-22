
import { useEffect, useMemo, useState } from "react";
import JobCard from "../components/JobCard.jsx";
import { sampleJobs } from "../data/sampleJobs.js";
import { api } from "../api.js";

export default function JobSearch() {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("All locations");

  const [backendJobs, setBackendJobs] = useState([]);
  const [customJobs] = useState(() =>
    JSON.parse(localStorage.getItem("skillbridge_custom_jobs") || "[]")
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch jobs posted through the backend.
  useEffect(() => {
    let active = true;

    async function fetchJobs() {
      try {
        setLoading(true);
        setError("");

        const data = await api("/jobs");

        if (active) {
          setBackendJobs(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load jobs from the server.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchJobs();

    return () => {
      active = false;
    };
  }, []);

  // Combine backend, localStorage, and sample jobs.
  const allJobs = useMemo(() => {
    return [
      ...backendJobs,
      ...customJobs,
      ...sampleJobs,
    ];
  }, [backendJobs, customJobs]);

  // Get available locations from all jobs.
  const locations = useMemo(() => {
    const uniqueLocations = [
      ...new Set(
        allJobs
          .map((job) => job.location || "Remote")
          .filter(Boolean)
      ),
    ];

    return ["All locations", ...uniqueLocations];
  }, [allJobs]);

  // Search jobs by title, company, location, and skills.
  const filteredJobs = useMemo(() => {
    return allJobs.filter((job) => {
      const skills =
        job.required_skills || job.requiredSkills || [];

      const searchable = [
        job.title,
        job.company,
        job.location,
        ...skills,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchable.includes(
        search.trim().toLowerCase()
      );

      const matchesLocation =
        location === "All locations" ||
        (job.location || "Remote") === location;

      return matchesSearch && matchesLocation;
    });
  }, [allJobs, search, location]);

  return (
    <main className="page-wrap">
      <div className="page-heading">
        <div className="eyebrow">CAREER OPPORTUNITIES</div>

        <h1>Find your next opportunity.</h1>

        <p>
          Discover jobs posted by companies and check how well
          your skills match each role.
        </p>
      </div>

      <div className="search-controls">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Job title, company, or skill..."
        />

        <select
          value={location}
          onChange={(event) => setLocation(event.target.value)}
        >
          {locations.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="muted">Loading jobs...</p>
      ) : (
        <>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          <p className="muted">
            {filteredJobs.length} jobs available
          </p>

          {filteredJobs.length > 0 ? (
            <div className="jobs-grid">
              {filteredJobs.map((job, index) => (
                <JobCard
                  key={`${job.id}-${index}`}
                  job={job}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2>No matching jobs found</h2>
              <p>
                Try a different job title, skill, or location.
              </p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
