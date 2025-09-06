// /pages/api/payment.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, amount, name, address } = req.body;

    if (!email || !amount || !name || !address) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Ensure amount is an integer (in cents)
    const amountCents = Math.round(amount);

    // Create PaymentIntent with automatic tax and shipping for fraud detection
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      automatic_tax: { enabled: true },
      receipt_email: email,
      description: "CustoMLearning Subscription",
      shipping: {
        name,
        address: {
          line1: address.line1,
          city: address.city,
          state: address.state,
          postal_code: address.postal_code,
          country: address.country,
        },
      },
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).json({ error: error.message });
  }
}
