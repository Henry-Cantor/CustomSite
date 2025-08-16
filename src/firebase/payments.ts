export const chargeUser = async (amount: number, options: { email: string }): Promise<boolean> => {
  console.log("Charging user", options.email, "amount $", amount);

  // Simulate async payment
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return true; // true = payment succeeded, false = failed
};