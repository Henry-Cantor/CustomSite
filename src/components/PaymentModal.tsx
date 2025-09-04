import { useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

type Props = {
  email: string;
  amount: number;
  onSuccess: () => void;
  onError: (err: string) => void;
  onClose?: () => void;
};

export default function PaymentModal({ email, amount, onSuccess, onError, onClose }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements) return;

    setLoading(true);
    try {
      const res = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, amount: Math.round(amount * 100 + amount * 100 * 0.06625) }),
      });
      const data = await res.json();
      const clientSecret = data.clientSecret;

      const card = elements.getElement(CardElement);
      if (!card) throw new Error("Card element not found");

      const result = await stripe.confirmCardPayment(clientSecret, { payment_method: { card } });

      if (result.error) {
        onError(result.error.message || "Payment failed");
      } else if (result.paymentIntent?.status === "succeeded") {
        onSuccess();
      } else {
        onError("Payment failed for unknown reason");
      }
    } catch (err: any) {
      onError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md space-y-4">
        <h2 className="text-xl font-bold">Payment</h2>
        <p>Enter your card details to pay ${amount} + sales tax:</p>

        <div className="border rounded-lg p-3">
          <CardElement options={{
            style: {
              base: { fontSize: "16px", color: "#111827", "::placeholder": { color: "#9ca3af" } },
              invalid: { color: "#ef4444" }
            }
          }} />
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={handlePay}
            disabled={!stripe || !elements || loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded"
          >
            {loading ? "Processing..." : `Pay $${Math.round(amount + amount * 0.06625)}`}
          </button>
          <button
            onClick={() => onClose && onClose()}
            className="bg-gray-300 px-4 py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
