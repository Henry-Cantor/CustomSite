// import Stripe from "stripe";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// export default async function handler(req, res) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   try {
//     const { amount } = req.body;

//     // Create a PaymentIntent with Stripe
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount, // in cents (e.g., 2000 = $20)
//       currency: "usd",
//       automatic_payment_methods: {
//         enabled: true,
//       },
//     });

//     res.status(200).json({ clientSecret: paymentIntent.client_secret });
//   } catch (error) {
//     console.error("Stripe error:", error);
//     res.status(500).json({ error: error.message });
//   }
// }


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

    // Create PaymentIntent with automatic tax and shipping
    const safeAddress = {
      line1: address.line1 || "N/A",
      city: address.city || "N/A",
      state: address.state || "N/A",
      postal_code: address.postal_code || "00000",
      country: address.country || "US",
    };

    const paymentIntent = await stripe.paymentIntents.create({
      amount, // already in cents from frontend
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      receipt_email: email,
      description: "CustoMLearning Subscription",
      automatic_tax: { enabled: true },
      shipping: {
        name,
        address: safeAddress,
      },
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).json({ error: error.raw ? error.raw.message : error.message });
  }
}
