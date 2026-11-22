import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api, getUser } from "../api.js";
import SkillMatch from "../components/SkillMatch.jsx";

const commonSkills = [
  "HTML",
  "CSS",
  "JavaScript",
  "React",
  "REST APIs",
  "Git",
  "Responsive Design",
  "Testing",
  "Python",
  "SQL",
  "FastAPI",
  "Communication",
];

function normalize(value = "") {
  return String(value).trim().toLowerCase().replace(/\./g, "");
}

function uniqueSkills(skills = []) {
  const map = new Map();

  skills.forEach((skill) => {
    if (skill && skill.trim()) {
      map.set(normalize(skill), skill.trim());
    }
  });

  return [...map.values()];
}

function splitSkills(value = "") {
  return uniqueSkills(value.split(","));
}

function calculateLocalMatch(job, candidateSkills) {
  const required = job.required_skills || [];
  const mandatory = job.mandatory_skills || [];

  const matched = required.filter((skill) =>
    candidateSkills.some(
      (candidate) => normalize(candidate) === normalize(skill)
    )
  );

  const missing = required.filter(
    (skill) =>
      !matched.some(
        (item) => normalize(item) === normalize(skill)
      )
  );

  const mandatoryMissing = mandatory.filter(
    (skill) =>
      !candidateSkills.some(
        (candidate) => normalize(candidate) === normalize(skill)
      )
  );

  const percentage = required.length
    ? Math.round((matched.length / required.length) * 100)
    : 0;

  const eligible =
    required.length > 0 &&
    percentage >= 75 &&
    mandatoryMissing.length === 0;

  return {
    matched,
    missing,
    mandatoryMissing,
    percentage,
    total: required.length,
    eligible,
  };
}

export default function JobDetails() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const user = getUser();

  const isRecruiter = ["recruiter", "company"].includes(
    normalize(user?.role)
  );

  const isStudent = ["student", "jobseeker"].includes(
    normalize(user?.role)
  );

  const [job, setJob] = useState(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [jobError, setJobError] = useState("");
  const [resume, setResume] = useState(null);
  const [skills, setSkills] = useState([]);
  const [manualSkills, setManualSkills] = useState([]);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [editForm, setEditForm] = useState({
    title: "",
    company: "",
    location: "",
    type: "Full-time",
    experience: "",
    description: "",
    requiredSkills: "",
    mandatorySkills: "",
  });

  // LOAD JOB FROM DATABASE
  useEffect(() => {
    let active = true;

    async function loadJob() {
      try {
        setLoadingJob(true);
        setJobError("");

        const data = await api(`/jobs/${jobId}`);

        if (!active) return;

        setJob(data);

        setEditForm({
          title: data.title || "",
          company: data.company || "",
          location: data.location || "",
          type: data.job_type || "Full-time",
          experience: data.experience || "",
          description: data.description || "",
          requiredSkills: (data.required_skills || []).join(", "),
          mandatorySkills: (data.mandatory_skills || []).join(", "),
        });
      } catch (error) {
        if (active) {
          setJobError(error.message || "Unable to load job.");
        }
      } finally {
        if (active) setLoadingJob(false);
      }
    }

    loadJob();

    return () => {
      active = false;
    };
  }, [jobId]);

  // CHECK WHETHER THE STUDENT HAS ALREADY APPLIED
  useEffect(() => {
    let active = true;

    async function checkApplicationStatus() {
      if (!isStudent || !jobId) {
        setHasApplied(false);
        return;
      }

      try {
        const applications = await api("/applications/mine");

        const list = Array.isArray(applications)
          ? applications
          : applications?.applications || [];

        if (active) {
          setHasApplied(
            list.some(
              (application) =>
                Number(application.job_id) === Number(jobId)
            )
          );
        }
      } catch (error) {
        console.error(
          "Unable to check application status:",
          error
        );
      }
    }

    checkApplicationStatus();

    return () => {
      active = false;
    };
  }, [jobId, isStudent]);

  const requiredSkills = job?.required_skills || [];
  const mandatorySkills = job?.mandatory_skills || [];

  const isJobOwner = Boolean(
    isRecruiter &&
      user?.id &&
      job?.owner_id &&
      Number(user.id) === Number(job.owner_id)
  );

  const candidateSkills = useMemo(
    () => uniqueSkills([...skills, ...manualSkills]),
    [skills, manualSkills]
  );

  // SKILL SELECTION
  function toggleSkill(skill) {
    const detected = skills.some(
      (item) => normalize(item) === normalize(skill)
    );

    const manual = manualSkills.some(
      (item) => normalize(item) === normalize(skill)
    );

    if (detected) {
      setSkills((previous) =>
        previous.filter(
          (item) => normalize(item) !== normalize(skill)
        )
      );
    } else if (manual) {
      setManualSkills((previous) =>
        previous.filter(
          (item) => normalize(item) !== normalize(skill)
        )
      );
    } else {
      setManualSkills((previous) => [...previous, skill]);
    }

    setResult(null);
    setMessage("Skills updated. Analyze again to check your match.");
  }

  // SELECT RESUME
  function uploadResume(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const extension = "." + file.name.split(".").pop().toLowerCase();

    if (![".pdf", ".docx", ".txt"].includes(extension)) {
      setMessage("Please select a PDF, DOCX, or TXT resume.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Resume must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    setResume(file);
    setSkills([]);
    setManualSkills([]);
    setResult(null);
    setMessage(
      "Resume selected. Click Analyze Resume to extract your skills."
    );
  }

  // ANALYZE RESUME AND MATCH SKILLS
  async function analyzeResume() {
    if (!resume) {
      setMessage("Please upload your resume first.");
      return;
    }

    setAnalyzing(true);
    setResult(null);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", resume);

      const resumeData = await api("/resume/analyze", {
        method: "POST",
        body: formData,
      });

      const extractedSkills = uniqueSkills(resumeData.skills || []);
      setSkills(extractedSkills);

      const allSkills = uniqueSkills([
        ...extractedSkills,
        ...manualSkills,
      ]);

      if (!allSkills.length) {
        setMessage(
          "No recognized skills were found. Add your skills manually and analyze again."
        );
        return;
      }

      await runSkillMatch(allSkills);
    } catch (error) {
      setMessage(error.message || "Unable to analyze your resume.");
    } finally {
      setAnalyzing(false);
    }
  }

  // MANUAL SKILL MATCHING
  async function analyzeManualSkills() {
    if (!candidateSkills.length) {
      setMessage("Please select at least one skill.");
      return;
    }

    setAnalyzing(true);
    setResult(null);
    setMessage("");

    try {
      await runSkillMatch(candidateSkills);
    } catch (error) {
      setMessage(error.message || "Unable to analyze skills.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function runSkillMatch(selectedSkills) {
    const localResult = calculateLocalMatch(job, selectedSkills);

    const serverResult = await api("/skills/match", {
      method: "POST",
      body: JSON.stringify({
        job_id: Number(job.id),
        candidate_skills: selectedSkills,
      }),
    });

    const matched =
      serverResult.matched ??
      serverResult.matched_skills ??
      localResult.matched;

    const missing =
      serverResult.missing ??
      serverResult.missing_skills ??
      localResult.missing;

    const mandatoryMissing =
      serverResult.mandatory_missing ??
      serverResult.mandatoryMissing ??
      localResult.mandatoryMissing;

    const percentage =
      serverResult.percentage ??
      serverResult.match_percentage ??
      localResult.percentage;

    const eligible =
      serverResult.eligible ??
      (
        Number(percentage) >= 75 &&
        mandatoryMissing.length === 0 &&
        requiredSkills.length > 0
      );

    const finalResult = {
      matched,
      missing,
      mandatoryMissing,
      percentage,
      total: requiredSkills.length,
      eligible,
      message: eligible
        ? "Congratulations! You meet the initial skill-match requirements."
        : "Your skills do not currently meet this job's requirements. Prepare the missing skills and analyze again.",
    };

    setResult(finalResult);

    setMessage(
      eligible
        ? "Analysis completed. You are eligible to apply."
        : "Analysis completed. Review your missing skills before applying."
    );
  }

  // APPLY FOR JOB
  async function applyForJob() {
    if (!isStudent) {
      setMessage("Please log in as a student to apply.");
      return;
    }

    if (hasApplied) {
      setMessage("You have already applied for this job.");
      return;
    }

    if (!result) {
      setMessage("Please analyze your resume before applying.");
      return;
    }

    if (!result.eligible) {
      setMessage(
        "Your skills do not match the job requirements. Please prepare the missing skills and try again."
      );
      return;
    }

    setApplying(true);
    setMessage("");

    try {
      const response = await api("/applications", {
        method: "POST",
        body: JSON.stringify({
          job_id: Number(job.id),
          candidate_skills: candidateSkills,
        }),
      });

      setHasApplied(true);

      setMessage(
        response.message || "Application submitted successfully!"
      );
    } catch (error) {
      setMessage(
        error.message || "Unable to submit your application."
      );
    } finally {
      setApplying(false);
    }
  }

  // RECRUITER JOB EDITING
  function updateEditForm(event) {
    setEditForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  }

  async function saveJobChanges(event) {
    event.preventDefault();
    setEditError("");

    if (!isJobOwner) {
      setEditError("You are not allowed to edit this job.");
      return;
    }

    const required = splitSkills(editForm.requiredSkills);
    const mandatory = splitSkills(editForm.mandatorySkills);

    if (!required.length) {
      setEditError("Enter at least one required skill.");
      return;
    }

    if (
      mandatory.some(
        (skill) =>
          !required.some(
            (item) => normalize(item) === normalize(skill)
          )
      )
    ) {
      setEditError(
        "Every mandatory skill must also be a required skill."
      );
      return;
    }

    setSaving(true);

    try {
      const updated = await api(`/jobs/${job.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editForm.title.trim(),
          company: editForm.company.trim(),
          location: editForm.location.trim(),
          job_type: editForm.type,
          experience: editForm.experience.trim(),
          description: editForm.description.trim(),
          required_skills: required,
          mandatory_skills: mandatory,
        }),
      });

      setJob(updated);
      setEditing(false);
      setResult(null);
      setMessage("Job updated successfully.");
    } catch (error) {
      setEditError(error.message || "Unable to update job.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteJob() {
    if (!isJobOwner) {
      setEditError("You are not allowed to delete this job.");
      return;
    }

    if (!window.confirm(`Delete "${job.title}"?`)) return;

    try {
      await api(`/jobs/${job.id}`, {
        method: "DELETE",
      });

      navigate("/jobs");
    } catch (error) {
      setEditError(error.message || "Unable to delete job.");
    }
  }

  // LOADING AND ERROR STATES
  if (loadingJob) {
    return (
      <main className="page-wrap">
        <section className="panel">
          <h2>Loading job details...</h2>
        </section>
      </main>
    );
  }

  if (jobError || !job) {
    return (
      <main className="page-wrap">
        <section className="panel">
          <h1>Job not found</h1>
          <p>{jobError || "This job is no longer available."}</p>
          <Link to="/jobs" className="button">
            Back to Jobs
          </Link>
        </section>
      </main>
    );
  }

  // UI
  return (
    <main className="page-wrap">
      <Link
        to={isRecruiter ? "/dashboard" : "/jobs"}
        className="text-link"
      >
        ← {isRecruiter ? "Back to Dashboard" : "Back to Jobs"}
      </Link>

      <section className="panel job-detail-panel">
        <div className="eyebrow">
          {job.job_type || "Job"} ·{" "}
          {job.experience || "Experience not specified"}
        </div>

        <h1>{job.title}</h1>

        <p>
          <strong>{job.company}</strong> · {job.location}
        </p>

        <p>{job.description}</p>

        <h3>Required skills</h3>

        <div className="skill-list">
          {requiredSkills.map((skill) => (
            <span className="skill-tag" key={skill}>
              {skill}
            </span>
          ))}
        </div>

        {mandatorySkills.length > 0 && (
          <>
            <h3>Mandatory skills</h3>

            <div className="skill-list">
              {mandatorySkills.map((skill) => (
                <span className="skill-tag" key={skill}>
                  {skill}
                </span>
              ))}
            </div>
          </>
        )}
      </section>

      {/* RECRUITER SECTION */}
      {isRecruiter && (
        <section className="panel">
          <h2>Manage this job</h2>

          {isJobOwner ? (
            <>
              {!editing ? (
                <div className="action-row">
                  <button
                    className="button"
                    type="button"
                    onClick={() => setEditing(true)}
                  >
                    Edit Job
                  </button>

                  <Link
                    to="/applications"
                    className="button button-outline"
                  >
                    View Applicants
                  </Link>

                  <button
                    className="button button-outline"
                    type="button"
                    onClick={deleteJob}
                  >
                    Delete Job
                  </button>
                </div>
              ) : (
                <form
                  className="form-stack"
                  onSubmit={saveJobChanges}
                >
                  <label>
                    Job title
                    <input
                      name="title"
                      required
                      value={editForm.title}
                      onChange={updateEditForm}
                    />
                  </label>

                  <label>
                    Company
                    <input
                      name="company"
                      required
                      value={editForm.company}
                      onChange={updateEditForm}
                    />
                  </label>

                  <label>
                    Location
                    <input
                      name="location"
                      value={editForm.location}
                      onChange={updateEditForm}
                    />
                  </label>

                  <label>
                    Job type
                    <select
                      name="type"
                      value={editForm.type}
                      onChange={updateEditForm}
                    >
                      <option>Full-time</option>
                      <option>Internship</option>
                      <option>Part-time</option>
                      <option>Contract</option>
                    </select>
                  </label>

                  <label>
                    Experience
                    <input
                      name="experience"
                      value={editForm.experience}
                      onChange={updateEditForm}
                    />
                  </label>

                  <label>
                    Job description
                    <textarea
                      name="description"
                      required
                      rows={5}
                      value={editForm.description}
                      onChange={updateEditForm}
                    />
                  </label>

                  <label>
                    Required skills
                    <input
                      name="requiredSkills"
                      required
                      value={editForm.requiredSkills}
                      onChange={updateEditForm}
                    />
                  </label>

                  <label>
                    Mandatory skills
                    <input
                      name="mandatorySkills"
                      value={editForm.mandatorySkills}
                      onChange={updateEditForm}
                    />
                  </label>

                  {editError && (
                    <p className="error-box">{editError}</p>
                  )}

                  <div className="action-row">
                    <button
                      className="button"
                      type="submit"
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>

                    <button
                      className="button button-outline"
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        setEditError("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <p className="muted">
              This job belongs to another recruiter.
            </p>
          )}

          {editError && !editing && (
            <p className="error-box">{editError}</p>
          )}
        </section>
      )}

      {/* STUDENT SECTION */}
      {isStudent && (
        <>
          <section className="panel">
            <div className="eyebrow">STEP 1</div>
            <h2>Upload your resume</h2>

            <p className="muted">
              Upload PDF, DOCX or TXT. Maximum size: 5 MB.
            </p>

            <label className="upload-box">
              <strong>
                {resume ? resume.name : "Choose your resume"}
              </strong>

              <small>PDF, DOCX, or TXT</small>

              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={uploadResume}
              />
            </label>

            <div className="action-row">
              <button
                className="button"
                type="button"
                disabled={!resume || analyzing}
                onClick={analyzeResume}
              >
                {analyzing ? "Analyzing Resume..." : "Analyze Resume"}
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="eyebrow">STEP 2</div>
            <h2>Confirm your skills</h2>

            <p className="muted">
              Skills extracted from your resume are selected
              automatically. You can also add or remove skills.
            </p>

            <div className="skill-picker">
              {uniqueSkills([
                ...commonSkills,
                ...requiredSkills,
              ]).map((skill) => {
                const checked = candidateSkills.some(
                  (item) =>
                    normalize(item) === normalize(skill)
                );

                return (
                  <label className="skill-checkbox" key={skill}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSkill(skill)}
                    />

                    {skill}

                    {mandatorySkills.some(
                      (item) =>
                        normalize(item) === normalize(skill)
                    ) && <strong> (Mandatory)</strong>}
                  </label>
                );
              })}
            </div>

            <div className="action-row">
              <button
                className="button"
                type="button"
                disabled={analyzing || !candidateSkills.length}
                onClick={analyzeManualSkills}
              >
                {analyzing ? "Analyzing..." : "Analyze Skill Match"}
              </button>

              <button
                className="button"
                type="button"
                disabled={
                  !result ||
                  !result.eligible ||
                  applying ||
                  hasApplied
                }
                onClick={applyForJob}
              >
                {hasApplied
                  ? "✓ Applied"
                  : applying
                    ? "Applying..."
                    : "Apply for Job"}
              </button>

              <Link
                to="/applications"
                className="button button-outline"
              >
                My Applications
              </Link>
            </div>

            {message && (
              <p className="notice" role="status">
                {message}
              </p>
            )}
          </section>

          {/* ANALYSIS RESULTS */}
          {result && (
            <section className="skill-analysis-section">
              <SkillMatch result={result} />

              <div className="panel">
                <h2>Resume skill analysis results</h2>

                <h3>
                  Match percentage: {result.percentage}%
                </h3>

                <p>
                  {result.matched.length} of {result.total} required
                  skills matched.
                </p>

                <h3>Matched skills</h3>

                <div className="skill-list">
                  {result.matched.length ? (
                    result.matched.map((skill) => (
                      <span className="skill-tag" key={skill}>
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p>None yet</p>
                  )}
                </div>

                <h3>Missing skills</h3>

                <div className="skill-list">
                  {result.missing.length ? (
                    result.missing.map((skill) => (
                      <span className="skill-tag" key={skill}>
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p>No missing required skills.</p>
                  )}
                </div>

                {result.mandatoryMissing.length > 0 && (
                  <p className="error-box">
                    Missing mandatory skills:{" "}
                    {result.mandatoryMissing.join(", ")}
                  </p>
                )}

                {result.eligible ? (
                  <p className="success-message">
                    You meet the initial skill-match requirements.
                    You can apply for this job.
                  </p>
                ) : (
                  <p className="error-box">
                    Your skills do not currently match this job's
                    requirements. Prepare the missing skills and
                    analyze again before applying.
                  </p>
                )}

                <div className="action-row">
                  <Link
                    to={`/preparation?job=${encodeURIComponent(
                      job.id
                    )}&missing=${encodeURIComponent(
                      result.missing.join(",")
                    )}`}
                    className="button button-outline"
                  >
                    Prepare Missing Skills
                  </Link>

                  <button
                    className="button"
                    type="button"
                    disabled={
                      !result.eligible ||
                      applying ||
                      hasApplied
                    }
                    onClick={applyForJob}
                  >
                    {hasApplied
                      ? "✓ Applied"
                      : applying
                        ? "Applying..."
                        : "Apply for Job"}
                  </button>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {!isRecruiter && !isStudent && (
        <section className="panel">
          <p>Please log in as a student to apply for this job.</p>

          <Link to="/login" className="button">
            Log In
          </Link>
        </section>
      )}
    </main>
  );
}