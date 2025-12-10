import { ChipIcon, LightBulbIcon, CogIcon, AcademicCapIcon } from "@heroicons/react/outline";

export default function QuickGuide() {
  const sections = [
    {
      icon: <AcademicCapIcon className="w-6 h-6 mr-2 text-purple-700" />,
      title: "Welcome to CustoMLearning",
      content: (
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800">
          <li><strong>Learn:</strong> Follow guided lessons to understand ML step-by-step.</li>
          <li><strong>Create:</strong> Build your own ML models with no coding required.</li>
          <li><strong>Test:</strong> Load saved models and run predictions on new inputs.</li>
        </ul>
      )
    },
    {
      icon: <LightBulbIcon className="w-6 h-6 mr-2 text-purple-700" />,
      title: "What is Machine Learning?",
      content: (
        <p className="text-sm text-gray-800 leading-relaxed">
          Machine Learning (ML) is how computers learn patterns from data instead of being told what to do. You give it examples — it figures out rules. ML is used for <em>predicting outcomes</em>, <em>classifying images</em>, <em>detecting patterns</em>, and more.
          ML can be used for tasks in all types of scientific and engineering fields, from reading X-rays to predicting weather patterns or even classifying bug bites!
        </p>
      )
    },
    {
      icon: <CogIcon className="w-6 h-6 mr-2 text-purple-700" />,
      title: "Create Model: Parameter Guide",
      content: (
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800">
          <li><strong>Input Type:</strong> Use <em>CSV</em> for data tables or <em>Image Folders</em> for visual classification.</li>
          <li><strong>Model Type:</strong> Choose MLP, FNN, CNN, RNN, LSTM, or Random Forest.</li>
          <ul>
            <li><strong>MLP:</strong> multi-layer perceptron, a deep-learning method used to analyze data tables.</li>
            <li><strong>FNN:</strong> feedforward neural network, a simple model to intake data tables.</li>
            <li><strong>CNN:</strong> convolutional neural network for grid patterns and images.</li>
            <li><strong>RNN:</strong> recurrent neural network, a simple way to analyze time-based data.</li>
            <li><strong>LSTM:</strong> long short term memory network, a more complex method of sequence analysis.</li>
            <li><strong>Random Forest:</strong> narrows data into bins of classification.</li>
          </ul>
          <li><strong>Preprocessing:</strong> Normalize, scale, or encode inputs before training. Use normalize unless necessary to reshape data.</li>
          <li><strong>Architecture:</strong> Defines the amount of processing power used in the model and rate and amount of data read.</li>
          <li><strong>Epochs / Batch Size:</strong> Controls training duration and amount of data being fed to the network.</li>
          <li><strong>Target Column:</strong> For CSVs, pick the data column your model should predict.</li>
          <li><strong>Save Location:</strong> Choose where to export your model + graphs.</li>
        </ul>
      )
    }
  ];

  return (
    <div className="space-y-6 p-4">
      {sections.map((sec, i) => (
        <div key={i} className="bg-purple-100 border border-purple-600 rounded-xl p-5 shadow-sm">
          <h2 className="flex items-center text-lg font-bold text-purple-800 mb-2">
            {sec.icon}
            {sec.title}
          </h2>
          <div>{sec.content}</div>
        </div>
      ))}
    </div>
  );
}
