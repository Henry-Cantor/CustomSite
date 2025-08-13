import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { chargeUser } from "../firebase/payments";
import { saveUserData } from "../firebase/firestore";

export default function Homepage() {
  const { user } = useAuth();

  const [step, setStep] = useState<"form" | "paying" | "done" | "error">("form");
  const [formData, setFormData] = useState({
    userType: "individual",
    classCode: "",
    name: "",
    waiverCode: "",
    email: "",
    password: "",
    renew: false,
  });
  const [error, setError] = useState("");

  const validWaiverCodes = ["WAIVER2025"]; // Example waiver codes

  const isWaiverValid = () => validWaiverCodes.includes(formData.waiverCode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep("paying");
    setError("");

    try {
      // Determine charge amount
      let chargeAmount = 20;
      if ((formData.userType === "teacher" || formData.userType === "student") && isWaiverValid()) {
        chargeAmount = 10;
      }

      // Here, paymentInfo is simplified - in real, get payment details from UI (e.g. Stripe)
      const paymentSuccess = await chargeUser(chargeAmount, {});

      if (!paymentSuccess) {
        setError("Payment failed. Please try again.");
        setStep("error");
        return;
      }

      // Save user data to Firestore
      await saveUserData(user!.uid, {
        student: formData.userType === "student",
        teacher: formData.userType === "teacher",
        classCode: formData.classCode || null,
        name: formData.name || null,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year expiry
      });

      // Trigger app download (implement actual logic)
      window.open("/path-to-app-download/CustoMLearning.zip", "_blank");

      setStep("done");
    } catch (err) {
      setError("Unexpected error: " + String(err));
      setStep("error");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-4xl font-bold text-purple-700 mb-4">Welcome to CustoMLearning</h1>
      <p>
        Learn machine learning with interactive lessons and datasets. Download the app below and start your journey!
      </p>

      {step === "form" && (
        <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-purple-50 rounded shadow">
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
            <>
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
            </>
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

          <button
            type="submit"
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            {formData.renew ? "Renew and Download" : "Download and Pay"}
          </button>
        </form>
      )}

      {step === "paying" && <p className="text-purple-700 font-semibold">Processing payment...</p>}
      {step === "done" && <p className="text-green-600 font-semibold">Thank you! Download should begin shortly.</p>}
      {step === "error" && <p className="text-red-600 font-semibold">{error}</p>}
    </div>
  );
}
