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
    question: "What does a classification task in machine learning do?",
    type: "multipleChoice",
    options: [
      "Predicts a continuous number",
      "Groups inputs into categories",
      "Estimates probabilities only",
      "Generates new data"
    ],
    answer: "Groups inputs into categories",
  },
  {
    id: 2,
    question: "Regression is focused on predicting numerical values rather than categories",
    type: "trueFalse",
    answer: true,
  },
];

const QUIZ = [
  {
    id: 1,
    q: "What is the main goal of a classification task?",
    options: [
      "Predicting numerical value",
      "Assigning an input to a class",
      "Reducing the number of features in data",
      "Rewarding the model",
    ],
    correct: 1,
  },
  {
    id: 2,
    q: "Which of the following best describes regression",
    options: [
      "Assigning inputs to categories",
      "Predicting continuous numerical values",
      "Grouping data with labels",
      "Detecting anomalies in datasets",
    ],
    correct: 1,
  },
  {
    id: 3,
    q: "How are classification and regression similar",
    options: [
      "Both are unsupervised learning tasks",
      "Both are reinforcement learning tasks",
      "Neither are supervised learning tasks that use labeled data",
      "Both do not require training data",
    ],
    correct: 1,
  },
  {
    id: 4,
    q: "When is it best to use classification algorithms?",
    options: [
      "Predicting stock prices",
      "Determining the category an input belongs to",
      "Reducing dimensionality of data",
      "Forecasting Population growth"
        ],
    correct: 1,
  },
  {
    id: 5,
    q: "Which of the following is the best example of a regression problem",
    options: [
      "Determining if an email is spam",
      "Predicting whether a patient is healthy or sick",
      "Predicting the price of a computer based on specs",
      "Classifying a photo as a cat or dog"        
    ],
    correct: 2,
  },
  {
    id: 6,
    q: "Which of the following is a classification task",
    options: [
      "Predicting tomorrow's temperature in degrees",
      "Predicting if a mushroom is poisonous or not",
      "Predicting the revenue of a company for the year",
      "Estimating the weight of a car",
    ],
    correct: 1,
  },
  {
    id: 7,
    q: "In regression problems, the output variable is always:",
    options: [
    "A category or class label",
    "A yes/no decision",
    "A continuous numerical value",
    "A cluster of data"
    ],
    correct: 2,
  },
  {
    id: 8,
    q: "What do classification and regression have in common?",
    options: [
      "Neither are used for reinforcement learning",
      "Both require labeled data for training",
      "Both are unsupervised learning techniques",
      "Both always predict discrete outputs",
    ],
    correct: 1,
  },
  {
    id: 9,
    q: "If you wanted to train a model to identify whether a fruit is an apple or banana:",
    options: [
      "Use regression",
      "Use classification",
      "Use clustering",
      "All of the above",
    ],
    correct: 1,
  },
  {
    id: 10,
    q: "Which of the following situations is most suitable for regression?",
    options: [
      "Determining whether a loan application should be approved or rejected",
      "Predicting the next word in a sentence",
      "Identifying the species of a flower based on petal length",
      "Predicting the height of a plant after 10 weeks",
    ],
    correct: 3,
  },
];


export default function Module2() {
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
    getModuleProgress(user.uid, "module2").then((data: any) => {
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
    saveModuleProgress(user.uid, "module2", updates);
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
      <h1 className="text-3xl font-bold text-indigo-600 mb-6">Module 2: Classification and Regression</h1>

      <section className="bg-purple-100 p-6 rounded shadow space-y-4">
        <h2 className="text-xl font-semibold">What are Classification and Regression?</h2>
        <p>
          Classification tasks in machine learning attempt to determine the category 
          that a given input belongs to. The correct answer is rewarded (reinforced) via reinforcement learning. It utilizes labeled examples and attempts to 
          learn how to associate new data to a previously identified class. 
        </p>
        <p>
         Unlike classification, regression is not attempting to assign an input to a category, instead it
         wants to correctly make a prediction on a numerical value. A very common regression algorithm is
         linear regression which is the formula: Y = B_0 + B_1x which is the same as Y = mx + b. Regression, same as classification, uses reinforcement learning.
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
        <h2 className="text-xl font-semibold">When is it best to use classification or regression algorithms?</h2>
        <p>
         Classification algorithms are best for when a task involves predicting the category that an input belongs to 
         like a label. There is Binary classification and Multi-class classification.
        </p>
        <p>
        Binary classification is when it is differentiating two classes like whether a patient is sick or healthy.
        Multi-class classification is when there are multiple classes like a model that uses image inputs to 
        determine an animal species out of a pool of multiple animals. 
        </p>
        <p>
          Regression algorithms are best for trying to predict a numerical value like the price of a house based on 
          square feet or the number of bedrooms. 
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