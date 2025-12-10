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
    question: "What is the primary goal of machine learning?",
    type: "multipleChoice",
    options: [
      "To hard-code behavior",
      "To write traditional algorithms",
      "To allow systems to learn from data",
    ],
    answer: "To allow systems to learn from data",
  },
  {
    id: 2,
    question: "This course has done a good job teaching you core concepts of ML",
    type: "trueFalse",
    answer: true,
  },
];

const QUIZ = [
  {
    id: 1,
    q: "What is the main goal of a classification task?",
    options: [
      "Predicting numerical values",
      "Grouping unlabeled data",
      "Assigning inputs to categories",
      "Reducing data dimensions",
    ],
    correct: 2,
  },
  {
    id: 2,
    q: "Which of the following is an example of unsupervised learning?",
    options: [
      "Spam email detection",
      "Image clustering by similarity",
      "Predicting house prices",
      "Fraud detection in banking",
    ],
    correct: 1,
  },
  {
    id: 3,
    q: "What is normalization in preprocessing?",
    options: [
      "Adjusting values to a standard scale",
      "Adding random noise to data",
      "Assigning labels to data",
      "Splitting data into training and testing",
    ],
    correct: 0,
  },
  {
    id: 4,
    q: "Epochs in training refer to:",
    options: [
      "The total number of neurons",
      "One full pass through the training data",
      "The batch size of inputs",
      "The validation step",
    ],
    correct: 1,
  },
  {
    id: 5,
    q: "Overfitting occurs when:",
    options: [
      "The model performs poorly on training data",
      "The model memorizes training data but fails on new data",
      "The model underestimates patterns in the data",
      "The dataset is too small",
    ],
    correct: 1,
  },
  {
    id: 6,
    q: "Which loss function is commonly used for regression?",
    options: [
      "Cross-entropy loss",
      "Mean Squared Error (MSE)",
      "Hinge loss",
      "Binary cross-entropy",
    ],
    correct: 1,
  },
  {
    id: 7,
    q: "What does it mean to deploy a model?",
    options: [
      "Train the model with more data",
      "Integrate the model into a real-world environment",
      "Save the model for backup",
      "Test the model on a validation set",
    ],
    correct: 1,
  },
  {
    id: 8,
    q: "Fraud detection models in banking are usually:",
    options: [
      "Clustering models",
      "Regression models",
      "Classification models",
      "Reinforcement models",
    ],
    correct: 2,
  },
  {
    id: 9,
    q: "What is the difference between supervised and unsupervised learning?",
    options: [
      "Supervised uses labels, unsupervised does not",
      "Unsupervised is always faster",
      "Supervised cannot handle images",
      "Both require labeled datasets",
    ],
    correct: 0,
  },
  {
    id: 10,
    q: "Which factor affects both performance and training time?",
    options: [
      "Activation function choice",
      "Learning rate, batch size, and epochs",
      "File format of dataset",
      "Choice of optimizer only",
    ],
    correct: 1,
  },
  {
    id: 11,
    q: "What is a feature in machine learning?",
    options: [
      "The output of a model",
      "A property or attribute used as input",
      "A type of loss function",
      "A layer in neural networks",
    ],
    correct: 1,
  },
  {
    id: 12,
    q: "Which algorithm is commonly used for clustering?",
    options: [
      "Linear regression",
      "K-means",
      "Logistic regression",
      "Decision tree",
    ],
    correct: 1,
  },
  {
    id: 13,
    q: "What is a hyperparameter?",
    options: [
      "A parameter learned by the model",
      "A parameter set before training",
      "The output of a model",
      "A type of loss function",
    ],
    correct: 1,
  },
  {
    id: 14,
    q: "Which metric is suitable for evaluating classification?",
    options: [
      "Mean Squared Error",
      "Accuracy",
      "R-squared",
      "Variance",
    ],
    correct: 1,
  },
  {
    id: 15,
    q: "Which type of learning uses rewards and penalties?",
    options: [
      "Supervised learning",
      "Unsupervised learning",
      "Reinforcement learning",
      "Dimensionality reduction",
    ],
    correct: 2,
  },
  {
    id: 16,
    q: "Why preprocess data?",
    options: [
      "You should not",
      "Reduce overfitting",
      "Training faster",
      "So it can be understood by the model",
    ],
    correct: 3,
  },
  {
    id: 17,
    q: "What is the difference between batch and stochastic gradient descent?",
    options: [
      "Batch uses full dataset, stochastic uses one sample per update",
      "Batch uses one sample, stochastic uses full dataset",
      "They are identical",
      "Stochastic is only for images",
    ],
    correct: 0,
  },
  {
    id: 18,
    q: "Which method can prevent overfitting?",
    options: [
      "Adding more features",
      "Dropout",
      "Increasing learning rate",
      "Removing training data",
    ],
    correct: 1,
  },
  {
    id: 19,
    q: "Which model type is best for predicting a continuous variable?",
    options: [
      "Regression",
      "Classification",
      "Clustering",
      "Dimensionality reduction",
    ],
    correct: 0,
  },
  {
    id: 20,
    q: "Which library is commonly used for deep learning in Python?",
    options: [
      "NumPy",
      "Pandas",
      "TensorFlow",
      "Matplotlib",
    ],
    correct: 2,
  },
  {
    id: 21,
    q: "What is underfitting?",
    options: [
      "Model performs well on training but poorly on test data",
      "Model cannot capture patterns in training data",
      "Model is too complex",
      "Dataset is too large",
    ],
    correct: 1,
  },
  {
    id: 22,
    q: "Which metric is suitable for regression evaluation?",
    options: [
      "Accuracy",
      "F1 Score",
      "Mean Squared Error",
      "Precision",
    ],
    correct: 2,
  },
  {
    id: 23,
    q: "Which technique is used for image data augmentation?",
    options: [
      "Rotation and flipping",
      "Cross-validation",
      "One-hot encoding",
      "Standardization",
    ],
    correct: 0,
  },
  {
    id: 24,
    q: "Which library is used for scientific computing in Python?",
    options: [
      "TensorFlow",
      "NumPy",
      "Scikit-learn",
      "Seaborn",
    ],
    correct: 1,
  },
  {
    id: 25,
    q: "Which algorithm is commonly used for decision-making with trees?",
    options: [
      "Linear regression",
      "Decision tree",
      "K-means",
      "PCA",
    ],
    correct: 1,
  },
  {
    id: 26,
    q: "Which of these is a type of neural network layer?",
    options: [
      "Convolutional layer",
      "Dropout layer",
      "Dense layer",
      "All of the above",
    ],
    correct: 3,
  },
  {
    id: 27,
    q: "What is a confusion matrix?",
    options: [
      "A matrix showing predictions vs actual labels",
      "A tool for preprocessing",
      "A dimensionality reduction technique",
      "A type of activation function",
    ],
    correct: 0,
  },
  {
    id: 28,
    q: "What is early stopping?",
    options: [
      "Stopping training when the model stops improving on validation",
      "Halting the optimizer",
      "Removing layers from a network",
      "Deleting data points",
    ],
    correct: 0,
  },
  {
    id: 29,
    q: "Which is a common kernel function in SVM?",
    options: [
      "Linear",
      "Polynomial",
      "RBF",
      "All of the above",
    ],
    correct: 3,
  },
  {
    id: 30,
    q: "Which optimizer adapts learning rate for each parameter?",
    options: [
      "SGD",
      "Adam",
      "Batch Gradient Descent",
      "Momentum",
    ],
    correct: 1,
  },
  {
    id: 31,
    q: "How is bias in a model bad?",
    options: [
      "Drops out data unfairly",
      "Overscales features",
      "Doesn't normalize data",
      "Leads to overfitting based on learned assumptions",
    ],
    correct: 3,
  },
  {
    id: 32,
    q: "What is regularization?",
    options: [
      "A technique to reduce overfitting",
      "A preprocessing step",
      "A type of activation function",
      "A loss function",
    ],
    correct: 0,
  },
  {
    id: 33,
    q: "Which technique increases training data artificially?",
    options: [
      "Data augmentation",
      "Cross-validation",
      "Dropout",
      "Feature scaling",
    ],
    correct: 0,
  },
  {
    id: 34,
    q: "Which type of problem is predicting house prices?",
    options: [
      "Regression",
      "Classification",
      "Clustering",
      "Reinforcement learning",
    ],
    correct: 0,
  },
  {
    id: 25,
    q: "Which step comes first in preprocessing?",
    options: [
      "Feature scaling",
      "Handling missing values",
      "Training the model",
      "Hyperparameter tuning",
    ],
    correct: 1,
  }
];




export default function Module11() {
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
    getModuleProgress(user.uid, "module11").then((data: any) => {
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
    saveModuleProgress(user.uid, "module11", updates);
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
      <h1 className="text-3xl font-bold text-indigo-600 mb-6">Module 11: Course Assessment</h1>

      <section className="bg-purple-100 p-6 rounded shadow space-y-4">
        <h2 className="text-xl font-semibold">What is Machine Learning?</h2>
        <p>
          This course introduces the fundamentals of machine learning, 
          covering key concepts like classification, regression, supervised 
          and unsupervised learning, and reinforcement learning.
        </p>
        <p>
         It explores essential steps in building models, including preprocessing,
         training settings, loss functions, and preventing overfitting, while also
         emphasizing real-world deployment and applications.
        </p>
      </section>



      <section className="bg-white p-6 rounded border shadow">
        <h2 className="text-xl font-bold mb-4">Course Assessment</h2>
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
