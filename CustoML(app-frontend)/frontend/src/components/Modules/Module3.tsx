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
    question: "Machine Learning models can be classified based on:",
    type: "multipleChoice",
    options: [
      "The way they learn from data",
      "The type of task they perform",
      "Both A and B",
      "Neither A nor B"
    ],
    answer: "Both A and B",
  },
  {
    id: 2,
    question: "Supervised learning uses labeled data to train a model to map inputs to outputs",
    type: "trueFalse",
    answer: true,
  },
];

const QUIZ = [
  {
    id: 1,
    q: "Machine learning models are classified mainly by:",
    options: [
      "The programming language they are written in",
      "The way they learn from data and the type of task they perform",
      "The size of the dataset used",
      "Whether they use Python or R",
    ],
    correct: 1,
  },
  {
    id: 2,
    q: "Supervised learning requires: ",
    options: [
      "A labeled dataset",
      "An unlabeled dataset",
      "hyperparameter optimization",
      "Detecting anomalies in datasets",
    ],
    correct: 0,
  },
  {
    id: 3,
    q: "Which of the following tasks falls under supervised learning: ",
    options: [
      "Clustering",
      "Regression",
      "Dimensionality Reduction",
      "Both A and C",
    ],
    correct: 1,
  },
  {
    id: 4,
    q: "Unsupervised learning is mainly used for: ",
    options: [
      "Predicting future stock prices",
      "Grouping or finding patterns in data without labels",
      "Reinforcement with reward and penalty systems",
      "Training with both labeled and unlabeled data"
        ],
    correct: 1,
  },
  {
    id: 5,
    q: "In reinforcement learning how does the model learn",
    options: [
      "By memorizing training data",
      "By interacting with the environment and receiving rewards or penalties",
      "By clustering similar data points",
      "By reducing dimensionality of data"        
    ],
    correct: 1,
  },
  {
    id: 6,
    q: "Which of the following is an unsupervised learning method: ",
    options: [
      "Logistic Regression",
      "Random Forest Classification",
      "K-means clustering",
      "Support Vector Machines",
    ],
    correct: 2,
  },
  {
    id: 7,
    q: "Which is a common example of reinforcement learning",
    options: [
    "Predicting house prices",
    "Spam email detection",
    "Autonomous driving cars",
    "Flower classification"
    ],
    correct: 2,
  },
  {
    id: 8,
    q: "What describes semi supervised learning?",
    options: [
      "A model is trained only on labeled data",
      "A model is trained only on unlabeled data",
      "A model is trained on both labeled and unlabeled data",
      "A model is only trained halfway",
    ],
    correct: 2,
  },
  {
    id: 9,
    q: "Which of these models are not supervised learning:",
    options: [
      "Logistic Regression",
      "Random Forest Classification",
      "Support Vector Machines",
      "Reinforcement Learning DQN",
    ],
    correct: 3,
  },
  {
    id: 10,
    q: "What type of learning do you use with CustoMLearning?",
    options: [
      "Unsupervised",
      "Supervised",
      "Non-reinforcement",
      "None of the above",
    ],
    correct: 1,
  },
];


export default function Module3() {
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
    getModuleProgress(user.uid, "module3").then((data: any) => {
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
    saveModuleProgress(user.uid, "module3", updates);
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
      <h1 className="text-3xl font-bold text-indigo-600 mb-6">Module 3: Types of Models</h1>

      <section className="bg-purple-100 p-6 rounded shadow space-y-4">
        <h2 className="text-xl font-semibold">How are Machine Learning Models classified??</h2>
        <p>
          They are classified through the way that they learn data such as supervised learning,
          unsupervised learning, semi-supervised learning, and reinforcement learning. Along 
          with this it is the type of task that a model is performing such as regression or clustering.
        </p>
        <p>
          Supervised learning refers to a model that is trained on a labeled dataset in which the model 
          is learning how to map an input to an outputfrom examples. Classification and regression algorithms 
          fall under this subset and common yet basic types of these models are Logistic Regression,
          Random Forest Classification, and Support Vector Machines.
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
        <h2 className="text-xl font-semibold">What are unsupervised and semi-supervised learning?</h2>
        <p>
          Unsupervised Learning is when a model is trained through the usage of unlabeled data 
          and is attempting to discover a pattern or some form of grouping. It includes clustering,
          which groups similar data points and dimensionality reduction, which uses less Features
          while maintaining structure. Common examples of unsupervised models are K-means. Semi-supervised
          learning occurs when a model is trained on a dataset that has both labeled and unlabeled data.
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