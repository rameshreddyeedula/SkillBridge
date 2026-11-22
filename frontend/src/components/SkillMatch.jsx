
export default function SkillMatch({ result }) {
  if (!result) return null;

  // Support both frontend and backend response formats
  const percentage =
    result.match_percentage ?? result.percentage ?? 0;

  const matched =
    result.matched_skills ?? result.matched ?? [];

  const missing =
    result.missing_skills ?? result.missing ?? [];

  const total =
    result.total_required ?? result.total ?? matched.length + missing.length;

  const mandatoryMissing =
    result.mandatory_missing ?? result.mandatoryMissing ?? [];

  const eligible = result.eligible ?? false;

  const message = result.message ?? "Skill analysis completed.";

  return (
    <section className="panel">
      <div className="match-heading">
        <div>
          <div className="eyebrow">SKILL ANALYSIS</div>

          <h2>
            {eligible
              ? "You meet the initial match threshold"
              : "Let's close your skill gaps"}
          </h2>
        </div>

        <div className="match-score">
          <strong>{percentage}%</strong>
          <span>
            {matched.length}/{total} skills
          </span>
        </div>
      </div>

      <div className="progress-track">
        <div
          className="progress-fill"
          style={{
            width: `${Math.max(0, Math.min(100, percentage))}%`,
          }}
        />
      </div>

      <p>{message}</p>

      <div className="match-columns">
        <div>
          <h3>✓ Matched Skills</h3>

          {matched.length > 0 ? (
            matched.map((skill) => (
              <span
                className="skill-matched skill-item"
                key={skill}
              >
                {skill}
              </span>
            ))
          ) : (
            <p>No required skills matched yet.</p>
          )}
        </div>

        <div>
          <h3>↗ Skills to Prepare</h3>

          {missing.length > 0 ? (
            missing.map((skill) => (
              <span
                className="skill-missing skill-item"
                key={skill}
              >
                {skill}
              </span>
            ))
          ) : (
            <p>No missing skills detected.</p>
          )}
        </div>
      </div>

      {mandatoryMissing.length > 0 && (
        <p className="warning">
          Mandatory skills not demonstrated:{" "}
          {mandatoryMissing.join(", ")}
        </p>
      )}
    </section>
  );
}
