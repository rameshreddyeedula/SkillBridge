
import { Link } from "react-router-dom";
import Hero from "../components/Hero.jsx";
import FeatureCard from "../components/FeatureCard.jsx";
import JobCard from "../components/JobCard.jsx";
import { sampleJobs } from "../data/sampleJobs.js";

export default function Home() {
  const features = [
    {
      number: "01",
      icon: "◎",
      title: "Discover Your Match",
      description:
        "Compare your skills with the actual requirements of a job."
    },
    {
      number: "02",
      icon: "✦",
      title: "Identify Skill Gaps",
      description:
        "Understand which skills you should strengthen before interviews."
    },
    {
      number: "03",
      icon: "▶",
      title: "Learn and Practise",
      description:
        "Get interview questions, explanations, and relevant learning videos."
    },
    {
      number: "04",
      icon: "↗",
      title: "Track Your Progress",
      description:
        "Apply for jobs and monitor your applications in one place."
    }
  ];

  return (
    <main>
      <Hero />

      <section className="section section-soft">
        <div className="section-heading">
          <div>
            <div className="eyebrow">WHY SKILLBRIDGE?</div>
            <h2>
              Don't just search for jobs.
              <br />
              <span>Prepare to get hired.</span>
            </h2>
          </div>

          <p>
            SkillBridge connects job discovery with job readiness,
            so you can learn what a role requires and prepare
            before your interview.
          </p>
        </div>

        <div className="feature-grid">
          {features.map((feature) => (
            <FeatureCard key={feature.number} {...feature} />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">EXPLORE OPPORTUNITIES</div>
            <h2>Start with these sample jobs</h2>
          </div>

          <Link to="/jobs" className="text-link">
            View all jobs ↗
          </Link>
        </div>

        <div className="jobs-grid">
          {sampleJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </section>

      <section className="cta-band">
        <div>
          <div className="eyebrow">YOUR NEXT CHAPTER</div>
          <h2>Find your gaps. Build your skills. Move forward.</h2>
        </div>

        <Link to="/register" className="button button-light">
          Create Account ↗
        </Link>
      </section>
    </main>
  );
}
