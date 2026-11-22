
import { useState } from "react";

export default function InterviewQuiz({ questions }) {
  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState(false);

  if (!questions?.length) {
    return <p>No practice questions available.</p>;
  }

  const score = questions.filter(
    (question, index) => answers[index] === question.correct
  ).length;

  return (
    <section className="quiz-list">
      {questions.map((question, index) => (
        <article className="question-card" key={question.id}>
          <div className="eyebrow">
            QUESTION {index + 1} · {question.skill}
          </div>

          <h3>{question.question}</h3>

          <div className="answer-options">
            {question.options.map((option, optionIndex) => {
              const isCorrect =
                checked && optionIndex === question.correct;

              const isWrong =
                checked &&
                answers[index] === optionIndex &&
                optionIndex !== question.correct;

              return (
                <label
                  key={option}
                  className={`answer-option ${
                    isCorrect ? "answer-correct" : ""
                  } ${isWrong ? "answer-wrong" : ""}`}
                >
                  <input
                    type="radio"
                    name={`question-${index}`}
                    checked={answers[index] === optionIndex}
                    onChange={() => {
                      setAnswers({
                        ...answers,
                        [index]: optionIndex
                      });
                      setChecked(false);
                    }}
                  />
                  {option}
                </label>
              );
            })}
          </div>

          {checked && (
            <div className="answer-feedback">
              <strong>
                {answers[index] === question.correct
                  ? "Correct answer!"
                  : "Review this topic"}
              </strong>

              <p>{question.explanation}</p>

              {answers[index] !== question.correct && (
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                    question.skill + " interview tutorial"
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Watch YouTube tutorials ↗
                </a>
              )}
            </div>
          )}
        </article>
      ))}

      <div className="quiz-submit">
        <button className="button" onClick={() => setChecked(true)}>
          Check Answers
        </button>

        {checked && (
          <strong>
            Score: {score}/{questions.length}
          </strong>
        )}
      </div>
    </section>
  );
}
