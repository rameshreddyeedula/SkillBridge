
import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        <div className="eyebrow">
          YOUR CAREER JOURNEY STARTS HERE
        </div>

        <h1>
          Turn Your Skills Into
          <br />
          <span>Career Opportunities.</span>
        </h1>

        <p>
          Find relevant jobs, discover your missing skills,
          practise interview questions, and prepare yourself
          for the role you want.
        </p>

        <div className="hero-actions">
          <Link to="/jobs" className="button">
            Explore Jobs ↗
          </Link>

          <Link to="/register" className="button button-outline">
            Get Started Free
          </Link>
        </div>

        <div className="hero-points">
          <span>✓ Skill matching</span>
          <span>✓ Interview practice</span>
          <span>✓ Personalized learning</span>
        </div>
      </div>

      <div className="hero-preview">
        <div className="preview-card">
          <div className="preview-top">
            <span>JOB READINESS REPORT</span>
            <span className="preview-status">DEMO</span>
          </div>

          <h2>Junior React Developer</h2>
          <p className="muted">Your skill match</p>

          <div className="preview-score">75%</div>

          <div className="progress-track">
            <div className="progress-fill" style={{ width: "75%" }} />
          </div>

          <div className="preview-skills">
            <span className="skill-matched">✓ HTML</span>
            <span className="skill-matched">✓ CSS</span>
            <span className="skill-matched">✓ React</span>
            <span className="skill-missing">REST APIs</span>
            <span className="skill-missing">Testing</span>
          </div>

          <div className="preview-tip">
            <strong>Your next step</strong>
            <p>
              Practise interview questions and learn the skills
              you still need.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
