import React from "react";
import { FileSpreadsheet, Heart, Home, Car, Dog } from "lucide-react";

export default function Datasets() {
  const topRow = [
    {
      id: 1,
      title: "Classification Practice (CSV)",
      desc: "A simple ML problem: classify ones and zeroes based on two input features.",
      link: "/exampleData/example1.csv",
      icon: <FileSpreadsheet className="w-6 h-6 text-purple-600" />,
    },
    {
      id: 2,
      title: "House Price Regression (CSV)",
      desc: "Dataset with house features to predict price. Great for regression practice.",
      link: "/exampleData/example2.csv",
      icon: <Home className="w-6 h-6 text-green-600" />,
    },
    {
      id: 3,
      title: "Gas Mileage (CSV)",
      desc: "Predict gas usage (mpg) from car features. Regression example for analysis.",
      link: "/exampleData/example3.csv",
      icon: <Car className="w-6 h-6 text-yellow-600" />,
    },
  ];

  const bottomRow = [
    {
      id: 4,
      title: "Pets Classification (Image Folder)",
      desc: "Public-domain dataset of cats, dogs, and birds for image classification practice.",
      link: async () => {
        const res = await fetch("/api/download?file=example4");
        if (!res.ok) throw new Error(`Failed to get download URL: ${res.status}`);
        const data = await res.json();
        return data.url;
      },
      icon: <Dog className="w-6 h-6 text-pink-600" />,
    },
    {
      id: 5,
      title: "Heart Disease (CSV)",
      desc: "Predict heart disease (0 = healthy, 1 = disease). Research dataset.",
      link: "/exampleData/example5.csv",
      icon: <Heart className="w-6 h-6 text-red-500" />,
    },
  ];

  const renderCard = (ds: any) => (
    <div
      key={ds.id}
      className="rounded-2xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition flex flex-col items-center w-full max-w-xs"
    >
      <div className="flex items-center gap-3 mb-3">
        {ds.icon}
        <h3 className="text-lg font-semibold text-center">
          {ds.id}. {ds.title}
        </h3>
      </div>
      <p className="text-gray-600 text-center flex-grow">{ds.desc}</p>
      <button
        className="mt-4 px-4 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition text-center"
        onClick={async () => {
          try {
            const url = typeof ds.link === "function" ? await ds.link() : ds.link;
            const a = document.createElement("a");
            a.href = url;
            a.download = "";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          } catch (err) {
            console.error("Download failed", err);
          }
        }}
      >
        Download
      </button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h2 className="text-3xl font-bold text-purple-700 mb-8 text-center">
        Example Datasets
      </h2>

      {/* Top row */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 justify-items-center mb-6">
        {topRow.map(renderCard)}
      </div>

      {/* Bottom row */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 justify-items-center">
        {bottomRow.map(renderCard)}
      </div>
    </div>
  );
}
