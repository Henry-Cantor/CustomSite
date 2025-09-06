import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, amount, address, name } = req.body;

    // Create a PaymentIntent with automatic tax
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      automatic_tax: { enabled: true }, // 🔑
      receipt_email: email,
      description: "CustoMLearning Subscription",
      shipping: { // optional but helps fraud + tax
        name,
        address,
      },
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).json({ error: error.message });
  }
}
