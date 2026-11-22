
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link, useSearchParams } from "react-router-dom";
import { sampleJobs } from "../data/sampleJobs.js";
import { api } from "../api.js";

const DEFAULT_SKILLS = [
  "HTML",
  "CSS",
  "JavaScript",
  "React",
  "Python",
  "FastAPI",
  "SQL",
  "REST APIs"
];

const TOPICS = {
  HTML: {
    theory:
      "HTML structures web pages. Elements describe content, attributes provide additional information, and semantic elements communicate the purpose of page regions.",
    concepts: ["Semantic elements", "Forms and validation", "Accessibility", "DOM structure"],
    questions: [
      ["What is semantic HTML?", "Semantic HTML uses meaningful elements such as header, nav, main, article, and footer to describe content structure."],
      ["What is the difference between div and section?", "A div is a generic container. A section groups related content, usually with a heading."],
      ["What is the purpose of the alt attribute?", "It provides alternative text for an image, improving accessibility and helping users when an image cannot load."],
      ["What is the difference between id and class?", "An id identifies one element within a document, while a class can be reused across multiple elements."],
      ["How do you validate an HTML form?", "Use attributes such as required, type, minlength, and pattern, and validate submitted data on the server too."]
    ]
  },
  CSS: {
    theory:
      "CSS controls presentation, layout, spacing, and responsive behavior. Understanding the cascade, specificity, box model, Flexbox, and Grid helps build maintainable interfaces.",
    concepts: ["Box model", "Specificity", "Flexbox", "CSS Grid", "Responsive design"],
    questions: [
      ["Explain the CSS box model.", "It consists of content, padding, border, and margin. The box-sizing property controls how width and height are calculated."],
      ["What is CSS specificity?", "Specificity helps determine which matching CSS declaration wins when rules conflict."],
      ["When would you use Flexbox?", "Flexbox is useful for arranging and aligning items along one dimension, either a row or a column."],
      ["What is CSS Grid?", "Grid is a two-dimensional layout system for arranging elements across rows and columns."],
      ["How do media queries help?", "They apply styles based on conditions such as viewport width, allowing layouts to adapt to different devices."]
    ]
  },
  JavaScript: {
    theory:
      "JavaScript adds behavior to web applications. Important concepts include variables, data types, scope, functions, arrays, objects, asynchronous programming, and error handling.",
    concepts: ["let, const, and var", "Closures and scope", "Array methods", "Promises", "async/await"],
    questions: [
      ["What is the difference between let and const?", "Both are block-scoped. let allows reassignment, while const prevents reassignment of the binding."],
      ["What does map() return?", "map() returns a new array containing the result of applying a callback to each array element."],
      ["What is a closure?", "A closure is a function that retains access to variables from its surrounding lexical scope."],
      ["What is the difference between == and ===?", "== may perform type conversion before comparison; === compares without that coercion."],
      ["What are async and await?", "They provide syntax for working with promises and make asynchronous code easier to read."]
    ]
  },
  React: {
    theory:
      "React builds user interfaces from reusable components. Props pass information into components, state stores changing data, and hooks provide features such as state and side effects.",
    concepts: ["Components and props", "useState", "useEffect", "Keys", "React Router"],
    questions: [
      ["What is a React component?", "A component is a reusable unit of UI, commonly implemented as a JavaScript function that returns JSX."],
      ["What is the difference between props and state?", "Props are passed into a component. State is data managed by a component that can change over time."],
      ["What does useState do?", "useState adds state to a function component and returns the current value and a setter function."],
      ["Why does useEffect need a dependency array?", "Dependencies control when an effect is rerun. The dependencies should include reactive values used by that effect."],
      ["Why are keys needed in lists?", "Stable keys help React associate rendered items with their identity when lists change."]
    ]
  },
  Python: {
    theory:
      "Python is a general-purpose programming language. Interview preparation should cover core data types, control flow, functions, modules, exceptions, and object-oriented programming.",
    concepts: ["Lists and dictionaries", "Functions", "OOP", "Exceptions", "Modules"],
    questions: [
      ["What is the difference between a list and a tuple?", "Lists are mutable; tuples are immutable sequences."],
      ["What is a dictionary?", "A dictionary stores key-value mappings and allows values to be retrieved by key."],
      ["What is the purpose of __init__?", "It initializes a newly created instance with its initial attributes."],
      ["What is exception handling?", "try and except blocks handle expected errors so a program can respond appropriately instead of failing unexpectedly."],
      ["What is the difference between == and is?", "== compares values, while is checks whether two references point to the same object."]
    ]
  },
  FastAPI: {
    theory:
      "FastAPI is a Python framework for building APIs. It supports request validation through type annotations and Pydantic models, dependency injection, and automatic API documentation.",
    concepts: ["Routes", "Pydantic models", "HTTP status codes", "Dependencies", "Async endpoints"],
    questions: [
      ["What is FastAPI?", "FastAPI is a Python web framework for building APIs with type hints, validation, and automatically generated documentation."],
      ["What is a Pydantic model?", "It defines a data structure and validates or parses incoming data according to declared fields and types."],
      ["How do you define a GET endpoint?", "Use a route decorator such as @app.get('/items') above a function that handles the request."],
      ["What is dependency injection?", "It lets a route declare required services or resources that FastAPI provides through dependency functions."],
      ["How should API errors be handled?", "Return appropriate HTTP status codes and clear error details, and avoid exposing sensitive internal information."]
    ]
  },
  SQL: {
    theory:
      "SQL is used to query and manage relational databases. Core topics include filtering, joins, aggregation, constraints, subqueries, transactions, and database design.",
    concepts: ["SELECT and WHERE", "JOINs", "GROUP BY and HAVING", "Keys", "Transactions"],
    questions: [
      ["What is a primary key?", "A primary key uniquely identifies each row in a table and cannot contain NULL values."],
      ["What is the difference between WHERE and HAVING?", "WHERE filters rows before grouping; HAVING filters groups after aggregation."],
      ["What is an INNER JOIN?", "It returns rows with matching values in both joined tables."],
      ["What is normalization?", "Normalization organizes relational data to reduce redundancy and prevent update anomalies."],
      ["What is a transaction?", "A transaction groups operations into a logical unit, commonly managed using ACID principles."]
    ]
  },
  "REST APIs": {
    theory:
      "REST APIs expose resources through HTTP. Clients exchange representations, commonly JSON, and use HTTP methods and status codes to communicate the outcome of requests.",
    concepts: ["HTTP methods", "Status codes", "JSON", "Authentication", "Idempotency"],
    questions: [
      ["What is a REST API?", "A REST-style API exposes resources through a consistent interface, commonly using HTTP methods and resource URLs."],
      ["What is the difference between GET and POST?", "GET typically retrieves data; POST commonly submits data or requests creation of a resource."],
      ["What does HTTP 404 mean?", "It means the requested resource was not found."],
      ["What is the difference between 401 and 403?", "401 indicates missing or invalid authentication; 403 indicates the server refuses the request."],
      ["What is idempotency?", "An operation is idempotent when repeating it has the same intended effect as performing it once."]
    ]
  },
  Git: {
    theory:
      "Git tracks changes to files over time. Developers use commits, branches, merges, and remote repositories to collaborate and maintain a reliable project history.",
    concepts: ["Commits", "Branches", "Merge conflicts", "Remote repositories", "Pull requests"],
    questions: [
      ["What does git commit do?", "It records staged changes as a new commit in the local repository."],
      ["What is a branch?", "A branch is an independent line of development that lets you work on changes separately."],
      ["What is a merge conflict?", "It occurs when Git cannot automatically reconcile overlapping changes and needs manual resolution."],
      ["What is the difference between fetch and pull?", "fetch downloads remote updates without integrating them; pull fetches and then integrates them."],
      ["Why use version control?", "It preserves history, supports collaboration, and makes it easier to review or revert changes."]
    ]
  },
  Testing: {
    theory:
      "Software testing checks whether an application behaves as expected. Unit, integration, and end-to-end tests examine different levels of functionality.",
    concepts: ["Unit tests", "Integration tests", "Assertions", "Test cases", "Regression testing"],
    questions: [
      ["What is a unit test?", "It tests a small, isolated unit of behavior, such as a function."],
      ["What is integration testing?", "It checks whether multiple components or services work together correctly."],
      ["What is regression testing?", "It checks that changes have not broken previously working behavior."],
      ["What makes a good test case?", "It includes clear preconditions, inputs, steps, and expected results."],
      ["What is an assertion?", "An assertion checks whether an observed result meets an expected condition."]
    ]
  },
  "Responsive Design": {
    theory:
      "Responsive design makes interfaces adapt to different screen sizes and input methods using flexible layouts, scalable content, and media queries.",
    concepts: ["Mobile-first design", "Media queries", "Flexible grids", "Viewport", "Accessibility"],
    questions: [
      ["What is responsive web design?", "It adapts a website layout to different devices and screen sizes."],
      ["What is mobile-first design?", "It starts with the constraints of smaller screens and progressively enhances the experience for larger screens."],
      ["Why use relative units?", "Units such as rem and percentages can make layouts and typography adapt more naturally."],
      ["What is a breakpoint?", "A breakpoint is a condition, often a viewport width, at which the layout changes."],
      ["How do you test responsiveness?", "Test different viewport sizes, real devices where possible, navigation, content overflow, and touch interactions."]
    ]
  },
  Communication: {
    theory:
      "Technical communication means explaining decisions clearly, listening to requirements, asking clarifying questions, and communicating risks and progress professionally.",
    concepts: ["Explaining technical decisions", "Clarifying requirements", "Teamwork", "Feedback", "Problem-solving"],
    questions: [
      ["How do you explain a technical issue to a non-technical person?", "Explain the impact in plain language, avoid unnecessary jargon, and describe the proposed next step."],
      ["How do you handle feedback?", "Listen carefully, clarify the feedback, evaluate it objectively, and agree on useful next actions."],
      ["What would you do if requirements were unclear?", "Ask focused questions, document assumptions, and confirm the expected outcome before implementation."],
      ["How do you prioritize tasks?", "Consider impact, urgency, dependencies, risk, and agreed project goals."],
      ["How do you handle a disagreement on a team?", "Discuss evidence and trade-offs respectfully, focus on the shared goal, and document the decision."]
    ]
  }
};

function normalize(value = "") {
  return value.trim().toLowerCase().replace(/\./g, "");
}

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getSkillContent(skill) {
  const exact = Object.keys(TOPICS).find(
    (item) => normalize(item) === normalize(skill)
  );

  if (exact) return TOPICS[exact];

  return {
    theory: `${skill} is a skill listed for this job. Review its purpose, core terminology, common workflows, practical use cases, limitations, and how it integrates with the other technologies in the role.`,
    concepts: [
      `${skill} fundamentals`,
      `${skill} common workflows`,
      `${skill} practical applications`,
      `${skill} debugging and troubleshooting`,
      `${skill} interview scenarios`
    ],
    questions: [
      [`What is ${skill}?`, `Explain what ${skill} is, the problem it solves, and where it is used.`],
      [`What are the core concepts of ${skill}?`, `Describe the main concepts of ${skill} and give an example of each.`],
      [`How have you used ${skill} in a project?`, `Describe the problem, your implementation, the result, and what you learned.`],
      [`What common mistakes occur when using ${skill}?`, `Explain common mistakes, how to recognize them, and how to prevent them.`],
      [`How would you troubleshoot a problem involving ${skill}?`, `Reproduce the issue, inspect the available evidence, isolate possible causes, test a fix, and verify the outcome.`]
    ]
  };
}

async function callMentor(endpoint, body) {
  return api(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export default function Preparation() {
  const [params] = useSearchParams();

  const jobId = params.get("job");
  const requestedMissing = (params.get("missing") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const user = readStorage("skillbridge_user", null);
  const customJobs = readStorage("skillbridge_custom_jobs", []);
  const allJobs = [...customJobs, ...sampleJobs];

  const job = jobId
    ? allJobs.find((item) => String(item.id) === String(jobId))
    : null;

  const requiredSkills = job?.requiredSkills?.length
    ? job.requiredSkills
    : DEFAULT_SKILLS;

  const [manualMissing, setManualMissing] = useState(requestedMissing);
  const [studyDays, setStudyDays] = useState(7);
  const [activeSkill, setActiveSkill] = useState("");
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const [testAnswers, setTestAnswers] = useState({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [aiMaterial, setAiMaterial] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  const skills = useMemo(
    () =>
      [...new Set(requiredSkills)].sort((a, b) => {
        const aMissing = manualMissing.some(
          (item) => normalize(item) === normalize(a)
        );
        const bMissing = manualMissing.some(
          (item) => normalize(item) === normalize(b)
        );

        return Number(bMissing) - Number(aMissing);
      }),
    [requiredSkills.join("|"), manualMissing.join("|")]
  );

  useEffect(() => {
    if (skills.length && !skills.some(
      (skill) => normalize(skill) === normalize(activeSkill)
    )) {
      setActiveSkill(skills[0]);
    }
  }, [skills, activeSkill]);

  const currentContent = getSkillContent(activeSkill || skills[0] || "General");

  const allQuestions = useMemo(
    () =>
      skills.flatMap((skill) =>
        getSkillContent(skill).questions.map(([question, answer], index) => ({
          id: `${skill}-${index}`,
          skill,
          question,
          answer
        }))
      ),
    [skills.join("|")]
  );

  const testQuestions = allQuestions.slice(0, 10);

  function isMissing(skill) {
    return manualMissing.some(
      (item) => normalize(item) === normalize(skill)
    );
  }

  function toggleMissing(skill) {
    setManualMissing((previous) =>
      previous.some((item) => normalize(item) === normalize(skill))
        ? previous.filter((item) => normalize(item) !== normalize(skill))
        : [...previous, skill]
    );

    setAiMaterial(null);
    setTestSubmitted(false);
    setTestAnswers({});
  }

  async function generateAiGuide() {
    setAiLoading(true);
    setAiError("");
    setAiMaterial(null);

    try {
      const data = await callMentor("/api/mentor/prepare", {
        user,
        job: job
          ? {
              title: job.title,
              company: job.company,
              description: job.description,
              requiredSkills: job.requiredSkills || [],
              mandatorySkills: job.mandatorySkills || []
            }
          : null,
        requiredSkills,
        missingSkills: manualMissing,
        studyDays,
        includeTheory: true,
        includeInterviewQuestions: true,
        includeAnswers: true,
        includeFinalAssessment: true
      });

      setAiMaterial(data);
    } catch (error) {
      setAiError(
        `${error.message} Showing the built-in study material for now. Connect your FastAPI AI endpoint to generate personalized content.`
      );
    } finally {
      setAiLoading(false);
    }
  }

  async function askMentor(event) {
    event.preventDefault();

    const question = chatInput.trim();

    if (!question || chatLoading) return;

    const newMessage = { role: "user", content: question };

    setChatMessages((previous) => [...previous, newMessage]);
    setChatInput("");
    setChatLoading(true);
    setChatError("");

    try {
      const data = await callMentor("/api/mentor/chat", {
        message: question,
        history: chatMessages.slice(-10),
        user,
        job: job
          ? {
              title: job.title,
              description: job.description,
              requiredSkills: job.requiredSkills || []
            }
          : null,
        missingSkills: manualMissing,
        context: "SkillBridge AI Career Mentor"
      });

      
const rawAnswer =
  data.answer ??
  data.message ??
  data.response ??
  "The AI service returned no answer. Please try again.";

let answer = rawAnswer;

if (typeof answer === "string") {
  try {
    const parsed = JSON.parse(answer);

    if (parsed && typeof parsed === "object") {
      answer =
        parsed.answer ??
        parsed.message ??
        parsed.response ??
        answer;
    } else if (typeof parsed === "string") {
      answer = parsed;
    }
  } catch {
    // Keep ordinary text unchanged.
  }
}

setChatMessages((previous) => [
  ...previous,
  {
    role: "assistant",
    content:
      typeof answer === "string"
        ? answer
        : JSON.stringify(answer, null, 2),
  },
]);

    } catch (error) {
      setChatError(
        `${error.message} The in-app AI mentor needs a working backend endpoint at /api/mentor/chat.`
      );
    } finally {
      setChatLoading(false);
    }
  }

  function submitTest() {
    setTestSubmitted(true);
  }

  const testScore = testQuestions.filter(
    (question) =>
      normalize(testAnswers[question.id] || "") ===
      normalize(question.answer)
  ).length;

  function downloadGuide() {
    window.print();
  }

  return (
    <main className="page-wrap preparation-page">
      <div className="page-heading no-print">
        <div className="eyebrow">SKILLBRIDGE LEARNING STUDIO</div>
        <h1>Your personalized interview preparation</h1>
        <p>
          {job
            ? `Prepare for ${job.title}${job.company ? ` at ${job.company}` : ""}.`
            : "Learn job-ready skills, practise interviews, and ask your AI mentor for help."}
        </p>
        {job && <Link className="text-link" to={`/jobs/${job.id}`}>← Back to job details</Link>}
      </div>

      <section className="panel no-print">
        <div className="eyebrow">YOUR SKILL ROADMAP</div>
        <h2>Choose what you need to improve</h2>
        <p className="muted">
          Missing skills are prioritized. You can change this selection if your analysis needs correcting.
        </p>

        <div className="skill-picker">
          {requiredSkills.map((skill) => (
            <label className="skill-checkbox" key={skill}>
              <input
                type="checkbox"
                checked={isMissing(skill)}
                onChange={() => toggleMissing(skill)}
              />
              Focus on {skill}
            </label>
          ))}
        </div>

        <label className="study-days">
          Study plan duration
          <select
            value={studyDays}
            onChange={(event) => setStudyDays(Number(event.target.value))}
          >
            <option value={3}>3 days</option>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
          </select>
        </label>

        <div className="skill-list">
          {skills.map((skill) => (
            <button
              type="button"
              className={`skill-tag ${activeSkill === skill ? "active" : ""} ${isMissing(skill) ? "skill-missing" : ""}`}
              key={skill}
              onClick={() => setActiveSkill(skill)}
            >
              {skill} {isMissing(skill) ? "· Priority" : ""}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="button"
          onClick={generateAiGuide}
          disabled={aiLoading}
        >
          {aiLoading ? "Generating AI study guide..." : "Generate Personalized AI Study Guide"}
        </button>

        {aiError && <p className="notice" role="status">{aiError}</p>}

        {aiMaterial && (
          <div className="ai-material">
            <h3>{aiMaterial.title || "Your AI-generated study guide"}</h3>
            <div className="ai-material-content">
              {typeof aiMaterial.content === "string"
                ? aiMaterial.content
                : JSON.stringify(aiMaterial.content || aiMaterial, null, 2)}
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="eyebrow">SKILL THEORY</div>
        <h2>{activeSkill || "Core skills"}: important concepts</h2>
        <p>{currentContent.theory}</p>

        <h3>Topics to revise</h3>
        <ul>
          {currentContent.concepts.map((concept) => (
            <li key={concept}>{concept}</li>
          ))}
        </ul>

        <p className="muted">
          This built-in material is a starting point. Generate the AI guide above for expanded, job-specific theory when your backend is connected.
        </p>
      </section>

      <section className="panel">
        <div className="eyebrow">INTERVIEW QUESTIONS</div>
        <h2>Questions and detailed answers</h2>
        <p className="muted">
          Study questions for every required skill. Open a question to review its sample answer.
        </p>

        {skills.map((skill) => {
          const content = getSkillContent(skill);

          return (
            <div className="prep-skill-section" key={skill}>
              <h3>
                {skill} {isMissing(skill) ? "— Priority practice" : ""}
              </h3>

              {content.questions.map(([question, answer], index) => {
                const id = `${skill}-${index}`;

                return (
                  <article className="prep-question" key={id}>
                    <button
                      type="button"
                      className="prep-question-toggle"
                      onClick={() =>
                        setRevealed((previous) => ({
                          ...previous,
                          [id]: !previous[id]
                        }))
                      }
                    >
                      <span>{index + 1}. {question}</span>
                      <span>{revealed[id] ? "−" : "+"}</span>
                    </button>

                    {revealed[id] && (
                      <div className="prep-answer">
                        <strong>Sample answer</strong>
                        <p>{answer}</p>
                        <a
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(skill + " interview questions tutorial")}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Find {skill} video tutorials on YouTube ↗
                        </a>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          );
        })}
      </section>

      <section className="panel no-print">
        <div className="eyebrow">AI CAREER MENTOR</div>
        <h2>Ask questions without leaving SkillBridge</h2>
        <p className="muted">
          Ask for explanations, examples, code walkthroughs, interview advice, or help with missing skills.
        </p>

        <div className="mentor-suggestions">
          {[
            `Explain ${activeSkill || "the required skills"} with a real-world example.`,
            `Give me five interview questions about ${activeSkill || "my job skills"}.`,
            `Create a ${studyDays}-day study plan for my missing skills.`,
            `Ask me one HTML interview question, wait for my answer, and then evaluate it.`
          ].map((suggestion) => (
            <button
              type="button"
              className="button button-outline"
              key={suggestion}
              onClick={() => setChatInput(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div className="mentor-chat" aria-live="polite">
          {chatMessages.length === 0 && (
            <p className="muted">
              Your conversation will appear here. Connect the AI backend to receive live answers.
            </p>
          )}

          {chatMessages.map((message, index) => (
            <div
              className={`mentor-message ${message.role === "user" ? "mentor-user" : "mentor-assistant"}`}
              key={`${message.role}-${index}`}
            >
              <strong>
  {message.role === "user" ? "You" : "SkillBridge Mentor"}
</strong>

<div className="mentor-markdown">
  {message.role === "assistant" ? (
    <ReactMarkdown>{message.content}</ReactMarkdown>
  ) : (
    <p>{message.content}</p>
  )}
</div>
            </div>
          ))}

          {chatLoading && <p className="muted">Your mentor is thinking...</p>}
          {chatError && <p className="notice">{chatError}</p>}
        </div>

        <form className="mentor-input-row" onSubmit={askMentor}>
          <textarea
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder="Ask your career mentor anything..."
            rows={3}
          />
          <button
            type="submit"
            className="button"
            disabled={chatLoading || !chatInput.trim()}
          >
            Send
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="eyebrow">FINAL ASSESSMENT</div>
        <h2>Test your knowledge</h2>
        <p className="muted">
          Answer the questions in your own words. Compare your responses with the sample answers and review any gaps.
        </p>

        {testQuestions.map((question, index) => (
          <label className="assessment-question" key={question.id}>
            <strong>{index + 1}. [{question.skill}] {question.question}</strong>
            <textarea
              rows={3}
              value={testAnswers[question.id] || ""}
              onChange={(event) => {
                setTestAnswers((previous) => ({
                  ...previous,
                  [question.id]: event.target.value
                }));
                setTestSubmitted(false);
              }}
              placeholder="Write your answer here..."
            />

            {testSubmitted && (
              <span className="assessment-model-answer">
                <strong>Review answer:</strong> {question.answer}
              </span>
            )}
          </label>
        ))}

        {!testSubmitted ? (
          <button type="button" className="button" onClick={submitTest}>
            Finish Assessment and Review Answers
          </button>
        ) : (
          <div className="notice">
            <h3>Assessment review complete</h3>
            <p>
              You answered {testQuestions.filter(
                (question) => (testAnswers[question.id] || "").trim()
              ).length} of {testQuestions.length} questions.
            </p>
            <p>
              Review the model answers above and practise explaining each concept without notes.
            </p>
            <p className="muted">
              This review is not an AI score. Automated answer evaluation will be available when the AI assessment endpoint is connected.
            </p>
          </div>
        )}
      </section>

      <section className="panel pdf-guide">
        <div className="eyebrow">YOUR INTERVIEW HANDBOOK</div>
        <h2>Download the complete preparation guide</h2>
        <p>
          Print or save this guide as a PDF, including the study plan, theory, questions, sample answers, and revision material displayed on this page.
        </p>
        <button type="button" className="button" onClick={downloadGuide}>
          Download / Save as PDF
        </button>
      </section>

      <section className="panel no-print">
        <h2>Recommended learning videos</h2>
        {skills.map((skill) => (
          <p key={skill}>
            <a
              className="text-link"
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(skill + " interview preparation tutorial")}`}
              target="_blank"
              rel="noreferrer"
            >
              ▶ {skill} tutorials and interview preparation ↗
            </a>
          </p>
        ))}
      </section>
    </main>
  );
}
