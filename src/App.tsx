import React from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import Homepage from "./pages/Homepage";
import Datasets from "./pages/Datasets";
import Privacy from "./pages/Privacy";
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
console.log(stripePromise)

function MLIcon() {
  return (
    <svg
      className="w-8 h-8 text-indigo-400"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="32" cy="32" r="5" />
      <circle cx="32" cy="8" r="4" />
      <circle cx="53.3" cy="18" r="4" />
      <circle cx="53.3" cy="46" r="4" />
      <circle cx="32" cy="56" r="4" />
      <circle cx="10.7" cy="46" r="4" />
      <circle cx="10.7" cy="18" r="4" />
      <line x1="32" y1="8" x2="32" y2="56" />
      <line x1="10.7" y1="18" x2="53.3" y2="46" />
      <line x1="53.3" y1="18" x2="10.7" y2="46" />
    </svg>
  );
}

export default function App() {
  return (
    
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 shadow bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo + title */}
          <NavLink
            to="/"
            aria-label="Go to Homepage"
            className="flex items-center space-x-2"
          >
            <MLIcon />
            <span className="text-indigo-400 font-bold text-xl select-none">
              CustoMLearning
            </span>
          </NavLink>

          {/* Links */}
          <div className="flex space-x-8">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `font-semibold text-lg transition-colors ${
                  isActive
                    ? "text-indigo-400 border-b-2 border-indigo-400"
                    : "hover:text-indigo-400"
                }`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/datasets"
              className={({ isActive }) =>
                `font-semibold text-lg transition-colors ${
                  isActive
                    ? "text-indigo-400 border-b-2 border-indigo-400"
                    : "hover:text-indigo-400"
                }`
              }
            >
              Datasets
            </NavLink>
            <NavLink
              to="/privacy"
              className={({ isActive }) =>
                `font-semibold text-lg transition-colors ${
                  isActive
                    ? "text-indigo-400 border-b-2 border-indigo-400"
                    : "hover:text-indigo-400"
                }`
              }
            >
              Privacy
            </NavLink>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto max-w-7xl mx-auto w-full">
        <Routes>
          <Route path="/" element={
            <Elements stripe={stripePromise}>
              <Homepage />
            </Elements>
          } />
          <Route path="/datasets" element={<Datasets />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<Homepage />} />
        </Routes>
      </main>
    </div>
  );
}
