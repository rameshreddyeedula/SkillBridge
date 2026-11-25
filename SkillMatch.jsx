export default function SkillMatch({ result }) {
  if (!result) return null;
  return <section className="panel match-panel"><div className="panel-title-row"><div><div className="eyebrow">YOUR SKILL ANALYSIS</div><h2>{result.eligible ? "You're ready to take the next step" : "Let's close your skill gaps"}</h2></div><div className={`match-score ${result.eligible ? "score-good" : "score-warn"}`}><strong>{result.match_percentage}%</strong><small>{result.matched_count}/{result.total_required} skills</small></div></div>
    <div className="progress-track large"><div className="progress-value" style={{width:`${result.match_percentage}%`}}></div></div>
    <p className="match-summary">{result.message}</p>
    <div className="skill-columns"><div><h3>✓ Matched skills</h3><div className="skill-list">{result.matched_skills.map(s=><span className="tag tag-good" key={s}>{s}</span>)}</div></div><div><h3>↗ Skills to strengthen</h3><div className="skill-list">{result.missing_skills.map(s=><span className="tag tag-gap" key={s}>{s}</span>)}</div></div></div>
    {result.mandatory_missing?.length > 0 && <p className="warning-text">Mandatory skills not yet demonstrated: {result.mandatory_missing.join(", ")}</p>}
  </section>;
}
