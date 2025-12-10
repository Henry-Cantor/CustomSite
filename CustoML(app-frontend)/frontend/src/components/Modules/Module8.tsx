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
    question: "Why might a user choose different loss functions for different tasks",
    type: "multipleChoice",
    options: [
      "All loss functions are identical, so it doesn’t matter",
      "Different tasks like regression, classification, or clustering require different ways of measuring error",
      "Loss functions determine the dataset size",
      "Loss functions replace activation functions"
    ],
    answer: "Different tasks like regression, classification, or clustering require different ways of measuring error",
  },
  {
    id: 2,
    question: "Loss functions quantify the error between a model's predictions and the actual values",
    type: "trueFalse",
    answer: true,
  },
];

const QUIZ = [
  {
    id: 1,
    q: "What does a Loss Function measure in a machine learning model?",
    options: [
      "How many parameters the model has",
      "The gap between predictions and actual values",
      "The number of epochs needed for training",
      "The computational resources used",
    ],
    correct: 1,
  },
  {
    id: 2,
    q: "Why are Loss Functions necessary?",
    options: [
      "They automatically tune hyperparameters",
      "They guide optimization by showing how wrong predictions are",
      "They prevent data preprocessing",
      "They select the activation function",
    ],
    correct: 1,
  },
  {
    id: 3,
    q: "A model predicts a student’s exam score as 82, but the real score is 90. Using Mean Absolute Error (MAE), what is the loss?",
    options: [
      "8",
      "64",
      "90",
      "172",
    ],
    correct: 0,
  },
  {
    id: 4,
    q: "Which Loss Function is best suited for a binary classification problem?",
    options: [
      "Huber Loss",
      "Cross-Entropy Loss",
      "Mean Squared Error",
      "K-Means Loss"
        ],
    correct: 1,
  },
  {
    id: 5,
    q: "A Support Vector Machine is typically trained using which Loss Function",
    options: [
      "Hinge Loss",
      "Mean Absolute Error",
      "Cross-Entropy Loss",
      "Log-Cosh Loss"        
    ],
    correct: 0,
  },
  {
    id: 6,
    q: "Which loss function is commonly used for multiclass classification problems?",
    options: [
      "Hinge Loss",
      "Cross-Entropy Loss",
      "Mean Squared Error",
      "Huber Loss"
    ],
    correct: 3,
  },
  {
    id: 7,
    q: "Mean Squared Error penalizes larger errors more than Mean Absolute Error",
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
    q: "Cross-Entropy loss is: ",
    options: [
      "Used for classification tasks",
      "Used for regression tasks",
      "Used for clustering",
      "Not a loss function",
    ],
    correct: 0,
  },
  {
    id: 9,
    q: "What is Mean Absolute Error in this scenario:(Predicted value:50000, Actual Value:60000)",
    options: [
      "10000^2",
      "10000",
      "1 - Recall",
      "(1-Recall)^2",
    ],
    correct: 1,
  },
  {
    id: 10,
    q: "Why learn about loss functions?",
    options: [
      "It is not important",
      "100% fix",
      "It is only for school",
      "They could make model training more efficient",
    ],
    correct: 3,
  },
];


export default function Module8() {
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
    getModuleProgress(user.uid, "module8").then((data: any) => {
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
    saveModuleProgress(user.uid, "module8", updates);
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
      <h1 className="text-3xl font-bold text-indigo-600 mb-6">Module 8: Loss Functions</h1>

      <section className="bg-purple-100 p-6 rounded shadow space-y-4">
        <h2 className="text-xl font-semibold">What are Loss Functions?</h2>
        <p>
         A loss function is used to indicate the performance of a machine learning model such
         that it is comparing the model’s prediction with the true value. The loss value is 
         the error and machine learning models strive to have the lowest error value or 
         the least loss. 
        </p>
        <p>
         What is the importance of Loss Functions? Loss functions can be used to help the 
        user adjust their parameters and optimize their model. Without them, the user may 
        struggle in evaluating their model’s performance and how they can improve it. There are
         also different loss functions for different tasks, since error can not simply apply 
         to all tasks like classification, regression, or clustering.
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
        <h2 className="text-xl font-semibold">What else is important about Loss Functions</h2>
        <p>
         What are Loss Functions for Regression Tasks? Mean Squared Error is a loss function 
        that takes the square of the difference between a model’s prediction and the absolute 
        value. It has a propensity to penalize errors more since it scales it. Mean Absolute Error
        is a loss function that just finds the absolute difference from the prediction and true value.
        A loss function that compares these two is Huber Loss that combines the Mean Squared Error
        and the Mean Absolute Error. 
        </p>
        <p>
         What are Loss Functions for Classification Tasks? Cross-Entropy Loss is commonly used 
         and is a measure of how far off a model’s prediction is from the true labels. 
         It is typically used for multiclass classification problems. Hinge Loss is used 
         for Support Vector Machines. 
        </p>
        <p>
         What is the main point of Loss Functions? They are used to evaluate a model 
         and determine how wrong it is, which can allow a user to optimize and work to minimize 
         the loss value and create the best model possible.
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