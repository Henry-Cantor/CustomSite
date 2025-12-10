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
    question: "What risk comes from setting the learning rate too high?",
    type: "multipleChoice",
    options: [
      "Training becomes unstable",
      "Training becomes too slow",
      "The model automatically overfits",
      "Batch size increases unexpectedly"
    ],
    answer: "Training becomes unstable",
  },
  {
    id: 2,
    question: "Training settings can't be chosen by the user or be adjusted to balance both performance and speed",
    type: "trueFalse",
    answer: false,
  },
];

const QUIZ = [
  {
    id: 1,
    q: "Which of the following best describes the impact of choosing the wrong training settings?",
    options: [
      "The model may train slowly or perform poorly",
      "The dataset will always become corrupted",
      "The model architecture must change",
      "The optimizer is no longer needed",
    ],
    correct: 0,
  },
  {
    id: 2,
    q: "What are training settings in a machine learning model?",
    options: [
      "The hardware used to train the model",
      "The conditions that regulate data flow, parameter updates, and training duration",
      "The number of input features in the dataset",
      "The type of activation function used",
    ],
    correct: 1,
  },
  {
    id: 3,
    q: "What does the learning rate control",
    options: [
      "The number of layers in the model",
      "The steps the model takes when updating its parameters",
      "The size of the training dataset",
      "The number of output classes",
    ],
    correct: 1,
  },
  {
    id: 4,
    q: "What is batch size?",
    options: [
      "The number of times a model trains on the entire dataset",
      "The number of training samples processed before updating the model's weights",
      "The number of neurons in a layer",
      "The number of layers in a neural network"
        ],
    correct: 1,
  },
  {
    id: 5,
    q: "Which training setting helps prevent overfitting by randomly turning off neurons during training",
    options: [
      "Learning Rate",
      "Early Stopping",
      "Dropout Rate",
      "Batch Size"        
    ],
    correct: 1,
  },
  {
    id: 6,
    q: "Why are training settings important",
    options: [
      "They define how a model learns, affecting its performance and training efficiency",
      "They eliminate the need for evaluation",
      "They automatically preprocess the dataset",
      "They determine the type of loss function used"
    ],
    correct: 0,
  },
  {
    id: 7,
    q: "The optimizer algorithm is used to: ",
    options: [
    "Update the weights of the model",
    "Determine the number of epochs",
    "Preprocess data",
    "Enhance reinforcement learning"
    ],
    correct: 0,
  },
  {
    id: 8,
    q: "A model was made with the wrong training settings, it most likely will have:",
    options: [
      "Strong performance and smooth training",
      "Poor performance",
      "Connections between layers",
      "Slow GPU",
    ],
    correct: 1,
  },
  {
    id: 9,
    q: "Which of the following do training settings not include: ",
    options: [
      "CPU",
      "Batch size",
      "Epochs",
      "Learning rate",
    ],
    correct: 0,
  },
  {
    id: 10,
    q: "When do you use kernel size?",
    options: [
      "CSVs",
      "It is not a training setting",
      "With all data",
      "Images",
    ],
    correct: 3,
  },
];


export default function Module6() {
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
    getModuleProgress(user.uid, "module6").then((data: any) => {
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
    saveModuleProgress(user.uid, "module6", updates);
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
      <h1 className="text-3xl font-bold text-indigo-600 mb-6">Module 6: Training Settings</h1>

      <section className="bg-purple-100 p-6 rounded shadow space-y-4">
        <h2 className="text-xl font-semibold">What are training settings?</h2>
        <p>
         The training settings are the conditions that a model uses when it trains. They regulate the flow of data and how parameters
         are updated, along with how long the model is trained. These settings are defined by the user and can be optimized for
         performance and speed respectively. 
        </p>
        <p>
         What are key training settings? The learning rate is in control of the steps that a model takes when updating its parameters. It is
        important to not have a too high value that results in unstable training or too low of a value that results in too slow training and a 
        lack of progress. The batch size refers to the quantity of training samples that get processed prior to updating weights. A small batch 
        size has fast updates, but is noisy or unorganized, whereas a large batch size has more fluid updates yet requires more storage and memory. An
        epoch is one complete pass that goes through the entirety of a training set and the user determines the number of epochs to optimize it. 
        However, it is important to not have too many epochs or else it could result in issues. 
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
        <h2 className="text-xl font-semibold">What else is important about Training Settings?</h2>
        <p>
             The optimizer algorithm can be determined by the user to update the weights of the model and it will have an impact on the model's
         accuracy along with the rate until it reaches its limit. There are also settings made to stop the model from accidentally overfitting such as the
         dropout rate which turns off certain neurons randomly in the training process. The user can also implement early stopping, which is a setting that will
         autonomously stop training if the model reaches a point where its performance plateaus and stops getting better. Padding and kernel size are used with images to affect amount of learning here.
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

      <section className="bg-purple-50 p-6 rounded shadow space-y-4">
        <h2 className="text-xl font-semibold">Why are training settings used?</h2>
        <p>
         The training settings are essential to a machine learning model because they have direct control over how the model
         learns and affects accuracy and speed. The correct settings can result in a model that presents strong performance and good training, while the wrong settings
         could result in the opposite. 
        </p>
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