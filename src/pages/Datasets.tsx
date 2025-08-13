import React from "react";

export default function Datasets() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-semibold text-purple-700 mb-6">Example Datasets</h2>
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold">1. Classification Practice (CSV)</h3>
          <p>A simple and classic machine learning problem. Classify ones and zeroes based on two input features.</p>
          <a
            href="/exampleData/example1.csv"
            className="font-semibold text-purple-600 hover:underline"
            download
          >
            Download #1
          </a>
        </div>
        <div>
          <h3 className="font-semibold">2. House Price Regression (CSV)</h3>
          <p>Dataset containing house features (in USD) to predict price. Valuable to learn regression, and an example of using ML in industry.</p>
          <a
            href="/exampleData/example2.csv"
            className="font-semibold text-purple-600 hover:underline"
            download
          >
            Download #2
          </a>
        </div>
        <div>
          <h3 className="font-semibold">3. Gas Mileage (CSV)</h3>
          <p>Dataset containing car features to predict gas usage (mpg). Regression model to model saving ability and environmental impact.</p>
          <a
            href="/exampleData/example3.csv"
            className="font-semibold text-purple-600 hover:underline"
            download
          >
            Download #3
          </a>
        </div>
        <div>
          <h3 className="font-semibold">4. Pets Classification (Image Folder)</h3>
          <p>Dataset cultivated from public domain, open source images to learn classification between cats, dogs, and birds.</p>
          <a
            href="/exampleData/example4.zip"
            className="font-semibold text-purple-600 hover:underline"
            download
          >
            Download #4
          </a>
        </div>
        <div>
          <h3 className="font-semibold">5. Heart Disease (CSV)</h3>
          <p>Classification dataset for the prediction of heart disease. Valuable example of neural networks in research to classify people between healthy (0) and heart disease (1).</p>
          <a
            href="/exampleData/example5.csv"
            className="font-semibold text-purple-600 hover:underline"
            download
          >
            Download #5
          </a>
        </div>
      </div>
    </div>
  );
}
