import React, { useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { chargeUser } from "../firebase/payments";

type Step = "form" | "paying" | "done" | "error" | "loginForm" | "loginPay";

export default function Homepage() {
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    userType: "individual",
    classCode: "",
    name: "",
    waiverCode: "",
    email: "",
    password: "",
    renew: false,
  });

  const validWaiverCodes = ["WAIVER2025"];
  const isWaiverValid = () => validWaiverCodes.includes(formData.waiverCode);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep("paying");
    setError("");

    try {
      // Determine charge amount
      let chargeAmount = 20;
      if ((formData.userType === "teacher" || formData.userType === "student") && isWaiverValid()) {
        chargeAmount = 10;
      }

      const paymentSuccess = await chargeUser(chargeAmount, {});

      if (!paymentSuccess) {
        setError("Payment failed. Please try again.");
        setStep("error");
        return;
      }

      // Create account in Firebase Auth
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: formData.name || formData.userType });

      // Save user info in Firestore
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
      await setDoc(doc(db, "users", user.uid), {
        student: formData.userType === "student",
        teacher: formData.userType === "teacher",
        classCode: formData.classCode || null,
        name: formData.name || null,
        createdAt: serverTimestamp(),
        expiresAt,
      });

      // Trigger download
      window.open("/path-to-app-download/CustoMLearning.zip", "_blank");

      setStep("done");
    } catch (err: any) {
      setError("Error: " + err.message);
      setStep("error");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep("loginPay");
    setError("");

    try {
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        setError("User record not found in database.");
        setStep("error");
        return;
      }

      // Charge user for renewal if needed
      let chargeAmount = 20;
      if ((snap.data().student || snap.data().teacher) && isWaiverValid()) chargeAmount = 10;

      const paymentSuccess = await chargeUser(chargeAmount, {});
      if (!paymentSuccess) {
        setError("Payment failed. Please try again.");
        setStep("error");
        return;
      }

      // Update expiresAt to 1 year from now
      const newExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      await setDoc(userRef, { expiresAt: newExpiresAt }, { merge: true });

      // Trigger download
      window.open("/path-to-app-download/CustoMLearning.zip", "_blank");

      setStep("done");
    } catch (err: any) {
      setError("Login failed: " + err.message);
      setStep("error");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-4xl font-bold text-purple-700 mb-4">Welcome to CustoMLearning</h1>
      <p>
        Learn machine learning with interactive lessons and datasets. Fill out the form below to register or renew your account.
      </p>

      {step === "form" && (
        <form onSubmit={handleRegister} className="space-y-4 p-6 bg-purple-50 rounded shadow">
          <div>
            <label className="block font-semibold mb-1">I am a:</label>
            <select
              value={formData.userType}
              onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
              required
              className="border p-2 w-full"
            >
              <option value="individual">Individual</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </div>

          {(formData.userType === "teacher" || formData.userType === "student") && (
            <div>
              <label className="block font-semibold mb-1">Class Code</label>
              <input
                type="text"
                value={formData.classCode}
                onChange={(e) => setFormData({ ...formData, classCode: e.target.value })}
                className="border p-2 w-full"
                placeholder="Enter your class code"
              />
            </div>
          )}

          {formData.userType === "student" && (
            <div>
              <label className="block font-semibold mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border p-2 w-full"
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <label className="block font-semibold mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="border p-2 w-full"
              placeholder="Email for account"
              required
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="border p-2 w-full"
              placeholder="Choose a password"
              required
            />
          </div>

          {(formData.userType === "teacher" || formData.userType === "student") && (
            <div>
              <label className="block font-semibold mb-1">Waiver Code (optional)</label>
              <input
                type="text"
                value={formData.waiverCode}
                onChange={(e) => setFormData({ ...formData, waiverCode: e.target.value })}
                className="border p-2 w-full"
                placeholder="Enter waiver code"
              />
            </div>
          )}

          <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
            Register & Pay
          </button>

          <button
            type="button"
            onClick={() => setStep("loginForm")}
            className="ml-4 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
          >
            Continue Existing Account
          </button>
        </form>
      )}

      {step === "loginForm" && (
        <form onSubmit={handleLogin} className="space-y-4 p-6 bg-purple-50 rounded shadow">
          <div>
            <label className="block font-semibold mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="border p-2 w-full"
              placeholder="Email"
              required
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="border p-2 w-full"
              placeholder="Password"
              required
            />
          </div>

          <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
            Login & Renew
          </button>

          <button type="button" onClick={() => setStep("form")} className="ml-4 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">
            Back to Registration
          </button>
        </form>
      )}

      {step === "paying" && <p className="text-purple-700 font-semibold">Processing payment...</p>}
      {step === "loginPay" && <p className="text-purple-700 font-semibold">Logging in and processing payment...</p>}
      {step === "done" && <p className="text-green-600 font-semibold">Thank you! Download should begin shortly.</p>}
      {step === "error" && <p className="text-red-600 font-semibold">{error}</p>}
    </div>
  );
}
