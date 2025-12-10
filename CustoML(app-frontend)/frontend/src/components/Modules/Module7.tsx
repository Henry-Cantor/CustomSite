import React, { useState, useEffect } from "react";
import { getModuleProgress, saveModuleProgress } from "../../firebase/learning";
import { useAuth } from "../../context/AuthContext";
import workflowImage from "./workflow.png";

interface ProgressCheck {
  id: number;
  question: string;
  type: "text" | "multipleChoice" | "trueFalse";
  options?: string[];
  answer: string | boolean;
}


const PROGRESS_CHECKS: ProgressCheck[] = [
  {
    id: 1,
    question: "Which of the following best describes the F1 Score?",
    type: "multipleChoice",
    options: [
      "The ratio of true positives to all positive predictions",
      "The ratio of true positives to true positives plus false negatives",
      "The harmonic mean of precision and recall",
      "The percentage of correct predictions"
    ],
    answer: "The harmonic mean of precision and recall",
  },
  {
    id: 2,
    question: "Evaluation metrics are used to measure how effectively a model performs its intended task",
    type: "trueFalse",
    answer: true,
  },
];

const QUIZ = [
  {
    id: 1,
    q: "What is the purpose of evaluation metrics in Machine Learning",
    options: [
      "To increase dataset size",
      "To assess a model's performance and effectiveness",
      "To make data preprocessing faster",
      "To reduce training time",
    ],
    correct: 1,
  },
  {
    id: 2,
    q: "Which of the following is not an evaluation metric for classification?",
    options: [
      "Accuracy",
      "Precision",
      "Recall",
      "Mean squared error",
    ],
    correct: 3,
  },
  {
    id: 3,
    q: "In regression, which metric measures how well a model fits the dataset",
    options: [
      "F1 score",
      "R-squared",
      "Recall",
      "Accuracy",
    ],
    correct: 1,
  },
  {
    id: 4,
    q: "Why might model size be considered an evaluation metric?",
    options: [
      "Larger models are always more accurate",
      "It determines how easy or difficult it is to deploy a model",
      "It reduces the number of evaluation metrics needed",
      "It automatically improves recall"
        ],
    correct: 1,
  },
  {
    id: 5,
    q: "In a credit card fraud detection model, which metric would likely be more important than accuracy?",
    options: [
      "Precision",
      "Recall",
      "Model Size",
      "Mean Squared Error"        
    ],
    correct: 1,
  },
  {
    id: 6,
    q: "Why is model size considered when evaluating a model?",
    options: [
      "Smaller models generally require less computational resources and are easier to deploy",
      "Larger models always perform worse",
      "Model size directly measures accuracy",
      "Model size eliminates the need for preprocessing"
    ],
    correct: 0,
  },
  {
    id: 7,
    q: "MAE(Mean Absolute Error) calculates the average absolute difference between predicted values and actual values",
    options: [
    "TRUE",
    "FALSE",
    "This defines mean squared error",
    "It enhances reinforcement learning"
    ],
    correct: 0,
  },
  {
    id: 8,
    q: "There are evaluation metrics beyond accuracy: ",
    options: [
      "Of course",
      "Nope",
      "They can't be considered metrics",
      "Accuracy isn't an evaluation metric",
    ],
    correct: 0,
  },
  {
    id: 9,
    q: "The formula for precision is: ",
    options: [
      "The number of true positives out of the total number of positive predictions",
      "The number of false positives out of the total number of positive predictions",
      "1 - Recall",
      "(1-Recall)^2",
    ],
    correct: 0,
  },
  {
    id: 10,
    q: "Have you learned about evaluation metrics?",
    options: [
      "I learned everything there is to know, nothing left to explore",
      "I don't think so",
      "Yes",
      "Not really",
    ],
    correct: 2,
  },
];


export default function Module7() {
  const { user } = useAuth();

  // Progress checks answers (string or boolean)
  const [checkAnswers, setCheckAnswers] = useState<Record<number, string | boolean>>({});
  const [checkRetakes, setCheckRetakes] = useState<Record<number, number>>({});
  const [checkCorrectness, setCheckCorrectness] = useState<Record<number, boolean>>({});

  // Quiz
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizRetakes, setQuizRetakes] = useState(0);

  // Load saved progress on mount
  useEffect(() => {
    if (!user) return;
    getModuleProgress(user.uid, "module7").then((data: any) => {
      if (!data) return;
      setCheckAnswers(data.checks || {});
      setQuizAnswers(data.quizAnswers || {});
      setQuizScore(data.score ?? null);
      setQuizSubmitted(data.score !== undefined);
      setCheckRetakes(data.checkRetakes || {});
      setQuizRetakes(data.quizRetakes || 0);

      // Set correctness for each check
      let newCorrectness: Record<number, boolean> = {};
      for (const c of PROGRESS_CHECKS) {
        newCorrectness[c.id] =
          data.checks && c.type === "trueFalse"
            ? data.checks[c.id] === c.answer
            : data.checks && data.checks[c.id]?.toString().trim().toLowerCase() ===
              (c.answer as string).toLowerCase();
      }
      setCheckCorrectness(newCorrectness);
    });
  }, [user]);

  // Save helper
  const saveProgress = (updates: any) => {
    if (!user) return;
    saveModuleProgress(user.uid, "module7", updates);
  };

  // Handle progress check answer changes
  const handleCheckAnswer = (id: number, val: string | boolean) => {
    if (checkCorrectness[id]) return; // Already correct, disable input

    const updatedAnswers = { ...checkAnswers, [id]: val };
    setCheckAnswers(updatedAnswers);

    // Check correctness immediately for feedback
    const check = PROGRESS_CHECKS.find((c) => c.id === id);
    if (!check) return;

    let isCorrect = false;
    if (check.type === "trueFalse") {
      isCorrect = val === check.answer;
    } else {
      isCorrect = val.toString().trim().toLowerCase() === (check.answer as string).toLowerCase();
    }

    const updatedCorrectness = { ...checkCorrectness, [id]: isCorrect };
    setCheckCorrectness(updatedCorrectness);

    // Save to Firebase including correctness & increment retakes if not correct
    const newRetakes = { ...checkRetakes };
    if (!isCorrect) {
      newRetakes[id] = (newRetakes[id] || 0) + 1;
      setCheckRetakes(newRetakes);
      saveProgress({ checkRetakes: newRetakes });
    }
    saveProgress({ checks: updatedAnswers });
  };

  // Retake single progress check
  const retakeCheck = (id: number) => {
    const updatedAnswers = { ...checkAnswers, [id]: "" };
    const updatedCorrectness = { ...checkCorrectness, [id]: false };
    setCheckAnswers(updatedAnswers);
    setCheckCorrectness(updatedCorrectness);

    saveProgress({ checks: updatedAnswers });
  };

  // Quiz handlers
  const handleQuizSelect = (qid: number, idx: number) => {
    if (quizSubmitted) return;
    setQuizAnswers({ ...quizAnswers, [qid]: idx });
  };

  const handleQuizSubmit = () => {
    let correctCount = 0;
    for (const q of QUIZ) {
      if (quizAnswers[q.id] === q.correct) correctCount++;
    }
    const percentScore = (correctCount / QUIZ.length) * 100;
    setQuizScore(percentScore);
    setQuizSubmitted(true);

    if (!user) return;

    // Increase retakes count on every submission (allow retakes even if passed)
    const newRetakes = quizRetakes + 1;
    setQuizRetakes(newRetakes);

    saveProgress({
      quizAnswers,
      score: percentScore,
      completed: percentScore >= 75,
      quizRetakes: newRetakes,
    });
  };

  const retakeQuiz = () => {
    setQuizSubmitted(false);
    setQuizScore(null);
    setQuizAnswers({});
  };

  return (
    <div className="space-y-8 text-gray-800 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-indigo-600 mb-6">Module 7: Evaluation Metrics</h1>

      <section className="bg-purple-100 p-6 rounded shadow space-y-4">
        <h2 className="text-xl font-semibold">What is an Evaluation Metric?</h2>
        <p>
         Evaluation Metrics are used in Machine Learning to assess how a model's performance and effectiveness is. 
         However, there are different evaluation metrics for different tasks, since there are different goals of models 
         like classification, regression or clustering. These metrics help the programmer determine if their model is 
         performing how it should.
        </p>
        <p>
         What are the Evaluation Metrics for Classification? One of the primary metrics for Classification is accuracy, which takes the percentage of 
        the correct predictions for a model’s performance.(Higher accuracies indicate a strong performing model). Another metric are Precision and 
        Recall scores, which are able to balance between true positives and false positives. Precision is the number of true positives out of the total 
        number of positive predictions or true positives + False Positives. Recall is the value of the True positives out of the True Positives + the False Negatives. 
        The F1 Score utilizes both the precision and recall values and takes the harmonic mean.
        </p>
      </section>

      <section className="bg-gray-100 p-6 rounded shadow space-y-4">
        <h3 className="font-semibold">Progress Check 1</h3>
        <p>{PROGRESS_CHECKS[0].question}</p>
        {PROGRESS_CHECKS[0].type === "multipleChoice" ? (
          PROGRESS_CHECKS[0].options?.map((opt, idx) => (
            <label
              key={idx}
              className={`block cursor-pointer ${
                checkCorrectness[PROGRESS_CHECKS[0].id]
                  ? opt === PROGRESS_CHECKS[0].answer
                    ? "text-green-600 font-bold"
                    : "text-gray-500 line-through"
                  : ""
              }`}
            >
              <input
                type="radio"
                name={`check-${PROGRESS_CHECKS[0].id}`}
                disabled={checkCorrectness[PROGRESS_CHECKS[0].id]}
                checked={checkAnswers[PROGRESS_CHECKS[0].id] === opt}
                onChange={() => handleCheckAnswer(PROGRESS_CHECKS[0].id, opt)}
                className="mr-2"
              />
              {opt}
            </label>
          ))
        ) : PROGRESS_CHECKS[0].type === "trueFalse" ? (
          ["True", "False"].map((val, idx) => (
            <label
              key={idx}
              className={`block cursor-pointer ${
                checkCorrectness[PROGRESS_CHECKS[0].id]
                  ? (val === "True") === PROGRESS_CHECKS[0].answer
                    ? "text-green-600 font-bold"
                    : "text-gray-500 line-through"
                  : ""
              }`}
            >
              <input
                type="radio"
                name={`check-${PROGRESS_CHECKS[0].id}`}
                disabled={checkCorrectness[PROGRESS_CHECKS[0].id]}
                checked={checkAnswers[PROGRESS_CHECKS[0].id] === (val === "True")}
                onChange={() => handleCheckAnswer(PROGRESS_CHECKS[0].id, val === "True")}
                className="mr-2"
              />
              {val}
            </label>
          ))
        ) : (
          <input
            type="text"
            disabled={checkCorrectness[PROGRESS_CHECKS[0].id]}
            className={`border p-2 w-full ${
              checkCorrectness[PROGRESS_CHECKS[0].id] ? "bg-green-100" : ""
            }`}
            value={String(checkAnswers[PROGRESS_CHECKS[0].id]) || ""}
            onChange={(e) => handleCheckAnswer(PROGRESS_CHECKS[0].id, e.target.value)}
          />
        )}
        {checkCorrectness[PROGRESS_CHECKS[0].id] ? (
          <p className="text-green-600 font-semibold mt-1">Correct! ✅</p>
        ) : (
          <button
            className="text-indigo-600 mt-2 underline text-sm"
            onClick={() => {
              setCheckAnswers({ ...checkAnswers, [PROGRESS_CHECKS[0].id]: "" });
            }}
          >
          </button>
        )}
        <button
          className="mt-2 text-sm text-indigo-600 hover:underline"
          onClick={() => {
            // Increment retakes and save
            const newRetakes = { ...checkRetakes };
            newRetakes[PROGRESS_CHECKS[0].id] = (newRetakes[PROGRESS_CHECKS[0].id] || 0) + 1;
            setCheckRetakes(newRetakes);
            saveProgress({ checkRetakes: newRetakes });
          }}
        >
        </button>
      </section>


      <section className="bg-purple-50 p-6 rounded shadow space-y-4">
        <h2 className="text-xl font-semibold">What else is important about Evaluation Metrics</h2>
        <p>
         What are Evaluation Metrics for Regression? Mean Squared Error is a common metric that squares 
         the difference between a model’s prediction and an actual value. (A model should strive to have 
         as low Mean Squared Error value as possible). There is also Mean Absolute Error, which takes the 
         average absolute difference from a model’s predicted value and the actual value. There is also the R^2 or R-squared value 
         that is used to tell how well a regression model is able to fit a dataset. 
        </p>
        <p>
         Are there Evaluation Metrics beyond accuracy or pure model performance? While the primary goal
         of a Machine Learning model is to perform the best at classification,regression, or something else,
         its model size is also an essential metric. This is measured in megabytes, gigabytes, or the number of parameters. 
         The importance of model size stems from the computational usage required to run a model in which smaller models 
         are easier to be deployed while larger models are harder. 
        </p>
        <p>
          How should Evaluation Metrics be considered by a user? While Evaluation Metrics are typically good for 
          understanding model performance, they are not always truly representative of real-world applications. 
          For example, for a model focused on credit card fraud detection, the recall value should be considered more
          important than the accuracy value. It is important for the user to understand their data and what a model’s 
          insights mean.
        </p>
      </section>


      <section className="bg-gray-100 p-6 rounded shadow space-y-4">
        <h3 className="font-semibold">Progress Check 2</h3>
        <p>{PROGRESS_CHECKS[1].question}</p>
        {PROGRESS_CHECKS[1].type === "multipleChoice" ? (
          PROGRESS_CHECKS[1].options?.map((opt, idx) => (
            <label
              key={idx}
              className={`block cursor-pointer ${
                checkCorrectness[PROGRESS_CHECKS[1].id]
                  ? opt === PROGRESS_CHECKS[1].answer
                    ? "text-green-600 font-bold"
                    : "text-gray-500 line-through"
                  : ""
              }`}
            >
              <input
                type="radio"
                name={`check-${PROGRESS_CHECKS[1].id}`}
                disabled={checkCorrectness[PROGRESS_CHECKS[1].id]}
                checked={checkAnswers[PROGRESS_CHECKS[1].id] === opt}
                onChange={() => handleCheckAnswer(PROGRESS_CHECKS[1].id, opt)}
                className="mr-2"
              />
              {opt}
            </label>
          ))
        ) : PROGRESS_CHECKS[1].type === "trueFalse" ? (
          ["True", "False"].map((val, idx) => (
            <label
              key={idx}
              className={`block cursor-pointer ${
                checkCorrectness[PROGRESS_CHECKS[1].id]
                  ? (val === "True") === PROGRESS_CHECKS[1].answer
                    ? "text-green-600 font-bold"
                    : "text-gray-500 line-through"
                  : ""
              }`}
            >
              <input
                type="radio"
                name={`check-${PROGRESS_CHECKS[1].id}`}
                disabled={checkCorrectness[PROGRESS_CHECKS[1].id]}
                checked={checkAnswers[PROGRESS_CHECKS[1].id] === (val === "True")}
                onChange={() => handleCheckAnswer(PROGRESS_CHECKS[1].id, val === "True")}
                className="mr-2"
              />
              {val}
            </label>
          ))
        ) : (
          <input
            type="text"
            disabled={checkCorrectness[PROGRESS_CHECKS[1].id]}
            className={`border p-2 w-full ${
              checkCorrectness[PROGRESS_CHECKS[1].id] ? "bg-green-100" : ""
            }`}
            value={String(checkAnswers[PROGRESS_CHECKS[1].id]) || ""}
            onChange={(e) => handleCheckAnswer(PROGRESS_CHECKS[1].id, e.target.value)}
          />
        )}
        {checkCorrectness[PROGRESS_CHECKS[1].id] ? (
          <p className="text-green-600 font-semibold mt-1">Correct! ✅</p>
        ) : (
          <button
            className="text-indigo-600 mt-2 underline text-sm"
            onClick={() => {
              setCheckAnswers({ ...checkAnswers, [PROGRESS_CHECKS[1].id]: "" });
            }}
          >
          </button>
        )}
        <button
          className="mt-2 text-sm text-indigo-600 hover:underline"
          onClick={() => {
            // Increment retakes and save
            const newRetakes = { ...checkRetakes };
            newRetakes[PROGRESS_CHECKS[1].id] = (newRetakes[PROGRESS_CHECKS[1].id] || 0) + 1;
            setCheckRetakes(newRetakes);
            saveProgress({ checkRetakes: newRetakes });
          }}
        >
        </button>
      </section>


      <section className="bg-white p-6 rounded border shadow">
        <h2 className="text-xl font-bold mb-4">End-of-Topic Quiz</h2>
        {QUIZ.map((q) => (
          <div key={q.id} className="mb-6">
            <p className="font-medium">{q.q}</p>
            {q.options.map((opt, idx) => {
              const isSelected = quizAnswers[q.id] === idx;
              const isCorrect = q.correct === idx;
              const showFeedback = quizSubmitted;
              return (
                <label
                  key={idx}
                  className={`block cursor-pointer ${
                    showFeedback
                      ? isCorrect
                        ? "text-green-600 font-bold"
                        : isSelected
                        ? "text-red-600 line-through"
                        : ""
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name={`quiz-${q.id}`}
                    disabled={quizSubmitted}
                    checked={isSelected}
                    onChange={() => handleQuizSelect(q.id, idx)}
                    className="mr-2"
                  />
                  {opt}
                </label>
              );
            })}
          </div>
        ))}

        {!quizSubmitted ? (
          <button
            className="bg-indigo-600 text-white px-4 py-2 rounded"
            onClick={handleQuizSubmit}
            disabled={Object.keys(quizAnswers).length !== QUIZ.length}
            title={
              Object.keys(quizAnswers).length !== QUIZ.length
                ? "Answer all questions before submitting"
                : undefined
            }
          >
            Submit Quiz
          </button>
        ) : (
          <>
            <p className="mt-4 font-semibold">
              {quizScore !== null &&
                (quizScore >= 75 ? "✅ Passed!" : "❌ Score too low.")}{" "}
              Your score: {quizScore?.toFixed(2)}%
            </p>
            <button
              className="mt-2 underline text-indigo-600"
              onClick={() => {
                setQuizSubmitted(false);
                setQuizScore(null);
                setQuizAnswers({});
                setQuizRetakes(quizRetakes + 1);
                saveProgress({ quizRetakes: quizRetakes + 1 });
              }}
            >
              Retake Quiz
            </button>
          </>
        )}
      </section>
    </div>
  );
}