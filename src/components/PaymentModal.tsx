import { useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

type Props = {
  email: string;
  amount: number; // base amount before tax
  onSuccess: () => void;
  onError: (err: string) => void;
  onClose?: () => void;
};

export default function PaymentModal({ email, amount, onSuccess, onError, onClose }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const [billingDetails, setBillingDetails] = useState({
    name: "",
    line1: "",
    city: "",
    state: "",
    postal_code: "",
    country: "US",
  });

  const handlePay = async () => {
    if (!stripe || !elements) return;

    setLoading(true);
    try {
      // create PaymentIntent with billing info
      const res = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          amount: Math.round(amount * 100), // in cents, let Stripe Tax handle tax
          name: billingDetails.name,
          address: {
            line1: billingDetails.line1,
            city: billingDetails.city,
            state: billingDetails.state,
            postal_code: billingDetails.postal_code,
            country: billingDetails.country,
          },
        }),
      });

      const data = await res.json();
      if (!data.clientSecret) throw new Error("No client secret from backend");

      const clientSecret = data.clientSecret;
      const card = elements.getElement(CardElement);
      if (!card) throw new Error("Card element not found");

      // confirm payment with billing details
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card,
          billing_details: {
            name: billingDetails.name,
            email,
            address: {
              line1: billingDetails.line1,
              city: billingDetails.city,
              state: billingDetails.state,
              postal_code: billingDetails.postal_code,
              country: billingDetails.country,
            },
          },
        },
      });

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
        <p>Enter your billing and card details to pay ${amount} (tax calculated at checkout):</p>

        <div className="space-y-2">
          <input
            type="text"
            placeholder="Full Name"
            className="w-full border rounded p-2"
            value={billingDetails.name}
            onChange={(e) => setBillingDetails({ ...billingDetails, name: e.target.value })}
          />
          <input
            type="text"
            placeholder="Street Address"
            className="w-full border rounded p-2"
            value={billingDetails.line1}
            onChange={(e) => setBillingDetails({ ...billingDetails, line1: e.target.value })}
          />
          <input
            type="text"
            placeholder="City"
            className="w-full border rounded p-2"
            value={billingDetails.city}
            onChange={(e) => setBillingDetails({ ...billingDetails, city: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="State"
              className="w-full border rounded p-2"
              value={billingDetails.state}
              onChange={(e) => setBillingDetails({ ...billingDetails, state: e.target.value })}
            />
            <input
              type="text"
              placeholder="ZIP"
              className="w-full border rounded p-2"
              value={billingDetails.postal_code}
              onChange={(e) => setBillingDetails({ ...billingDetails, postal_code: e.target.value })}
            />
          </div>
          <input
            type="text"
            placeholder="Country (e.g. US)"
            className="w-full border rounded p-2"
            value={billingDetails.country}
            onChange={(e) => setBillingDetails({ ...billingDetails, country: e.target.value })}
          />
        </div>

        <div className="border rounded-lg p-3">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#111827",
                  "::placeholder": { color: "#9ca3af" },
                },
                invalid: { color: "#ef4444" },
              },
            }}
          />
        </div>

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
