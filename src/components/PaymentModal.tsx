import { useEffect, useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

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
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Create PaymentIntent as soon as modal opens
  useEffect(() => {
    fetch("/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, amount: amount * 100 }),
    })
      .then(res => res.json())
      .then(data => setClientSecret(data.clientSecret))
      .catch(err => onError(err.message || String(err)));
  }, [email, amount, onError]);

  const handlePay = async () => {
    if (!stripe || !elements || !clientSecret) return;

    setLoading(true);
    try {
      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: window.location.href, // Stripe will redirect on success
        },
      });

      if (result.error) {
        // Show error to your user
        onError(result.error.message || "Payment failed");
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
        <p>You’ll be charged ${amount} (+ tax if applicable):</p>

        {clientSecret && (
          <div className="border rounded-lg p-3">
            <PaymentElement options={{ layout: "tabs" }} />
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <button
            onClick={handlePay}
            disabled={!stripe || !elements || loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded"
          >
            {loading ? "Processing..." : `Pay $${amount}`}
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
