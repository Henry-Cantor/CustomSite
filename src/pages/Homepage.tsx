import React, { useState } from "react";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  increment,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { chargeUser } from "../firebase/payments";
import PaymentModal from "../components/PaymentModal";




type Step = "form" | "paying" | "done" | "error" | "loginForm" | "loginPay";

export default function Homepage() {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [chargeAmount, setChargeAmount] = useState(0);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const [paymentContext, setPaymentContext] = useState<"register" | "login" | null>(null);

  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    userType: "individual",
    classCode: "",
    name: "",
    waiverCode: "",
    email: "",
    password: "",
    advertiserName: "", // NEW optional field
    system: "Mac"
  });

  React.useEffect(() => {
  const data = localStorage.getItem("pendingRegistration");
  if (data) setFormData(JSON.parse(data));
}, []);

React.useEffect(() => {
  if (!paymentSuccess) return;

  setShowPaymentModal(false);

  if (paymentContext === "register") {
    handlePostPayment();
  } else if (paymentContext === "login") {
    handlePostPaymentLogin();
  }

  setPaymentContext(null); // reset context
}, [paymentSuccess]);



// Save session before payment or login
const saveSessionData = () => {
  localStorage.setItem("pendingRegistration", JSON.stringify(formData));
};
const handlePostPaymentLogin = async () => {
  try {
    const auth = getAuth();
    const userCredential = await signInWithEmailAndPassword(
      auth,
      formData.email.trim(),
      formData.password
    );
    const user = userCredential.user;

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) throw new Error("User record not found.");

    const data = snap.data() || {};
    const now = Timestamp.now();

    // Check if account is still active
    let needsPayment = true;
    if (data.expiresAt && data.expiresAt.toMillis() > now.toMillis()) {
      needsPayment = false; // account still active, no payment needed
    }

    if (needsPayment) {
      let chargeAmount = 20;
      if ((data.student || data.teacher) && isWaiverValid()) chargeAmount = 10;

      setChargeAmount(chargeAmount);
      setShowPaymentModal(true);
      setPaymentSuccess(false); // wait for modal success
      return; // exit now; modal onSuccess will trigger this function again if needed
    }

    // Account active or post-payment → update expiry
    await setDoc(userRef, { expiresAt: oneYearFromNow() }, { merge: true });

    // Optional advertiser bump
    if (formData.advertiserName) await bumpAdvertiser(formData.advertiserName);
    await countLogin()
    // Trigger download based on system
    const downloadFolder = process.env.DOWNLOAD_NAME;
    if (formData.system === "Linux") downloadFile(`/${downloadFolder}/1.0-linux.zip`, "linuxDownload.zip");
    else if (formData.system === "Windows") downloadFile(`/${downloadFolder}/1.0-win.zip`, "winDownload.zip");
    else downloadFile(`/${downloadFolder}/1.0-mac.zip`, "macDownload.zip");

    localStorage.removeItem("pendingRegistration");
    setStep("done");
  } catch (err: any) {
    setError("Login failed: " + (err?.message || String(err)));
    setStep("error");
  }
};

const handlePostPayment = async () => {
  try {
    const auth = getAuth();
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      formData.email.trim(),
      formData.password
    );
    const user = userCredential.user;

    await updateProfile(user, { displayName: formData.name || formData.userType });

    await setDoc(doc(db, "users", user.uid), {
      student: formData.userType === "student",
      teacher: formData.userType === "teacher",
      classCode: formData.classCode || null,
      name: formData.name || null,
      createdAt: serverTimestamp(),
      expiresAt: oneYearFromNow()
    });

    if (formData.advertiserName) await bumpAdvertiser(formData.advertiserName);
    await countRegister()

    const downloadFolder = process.env.DOWNLOAD_NAME;
    if (formData.system === "Linux") downloadFile(`/${downloadFolder}/1.0-linux.zip`, "linuxDownload.zip");
    else if (formData.system === "Windows") downloadFile(`/${downloadFolder}/1.0-win.zip`, "winDownload.zip");
    else downloadFile(`/${downloadFolder}/1.0-mac.zip`, "macDownload.zip");

    localStorage.removeItem("pendingRegistration");
    setStep("done");
  } catch (err: any) {
    setError("Error: " + (err?.message || String(err)));
    setStep("error");
  }
};

const handleCheckout = async (amount: number) => {
  saveSessionData();
  setStep("paying");
  setError("");

  try {
    // After: same URL, relative path works for dev and production
    const res = await fetch("/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: formData.email.trim(), amount: amount * 100 })
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url; // redirect to Stripe Checkout
    } else {
      throw new Error("Failed to create checkout session.");
    }
  } catch (err: any) {
    console.error(err);
    setError("Payment failed: " + (err?.message || ""));
    setStep("error");
  }
};


const downloadFile = (url: string, filename: string) => {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename; // forces download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


  const validWaiverCodes = ["ax791kcl$20"];
  const isWaiverValid = () => validWaiverCodes.includes(formData.waiverCode.trim());

  const oneYearFromNow = () => Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));

  // Increment advertiser counter (meta/advertisers doc, field per lowercase name)
  const bumpAdvertiser = async (rawName: string) => {
    const key = rawName.trim().toLowerCase();
    if (!key) return;
    const ref = doc(db, "meta", "advertisers");
    // increment creates the field if missing
    await setDoc(ref, { [key]: increment(1) } as any, { merge: true });
  };
  const countRegister = async () => {
    const key = "creations".trim().toLowerCase();
    if (!key) return;
    const ref = doc(db, "meta", "downloadActivity");
    // increment creates the field if missing
    await setDoc(ref, { [key]: increment(1) } as any, { merge: true });
  };
  const countLogin = async () => {
    const key = "renewals".trim().toLowerCase();
    if (!key) return;
    const ref = doc(db, "meta", "downloadActivity");
    // increment creates the field if missing
    await setDoc(ref, { [key]: increment(1) } as any, { merge: true });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    saveSessionData();
    setStep("paying");
    setError("");
    setPaymentContext("register")
    try {
      let chargeAmount = 20;
      if ((formData.userType === "teacher" || formData.userType === "student") && isWaiverValid()) {
        chargeAmount = 10;
      }


      setChargeAmount(chargeAmount);
      setShowPaymentModal(true);  // <-- show modal
      setPaymentSuccess(false);

      // await handleCheckout(chargeAmount)
      //const paymentSuccess = await chargeUser(chargeAmount, {email: formData.email.trim()});
      // if (!paymentSuccess) {
      //   setError("Payment failed. Please try again.");
      //   setStep("error");
      //   return;
      // }

    //   const auth = getAuth();
    //   const userCredential = await createUserWithEmailAndPassword(
    //     auth,
    //     formData.email.trim(),
    //     formData.password
    //   );
    //   const user = userCredential.user;

    //   await updateProfile(user, { displayName: formData.name || formData.userType });

    //   await setDoc(doc(db, "users", user.uid), {
    //     student: formData.userType === "student",
    //     teacher: formData.userType === "teacher",
    //     classCode: formData.classCode || null,
    //     name: formData.name || null,
    //     createdAt: serverTimestamp(),
    //     expiresAt: oneYearFromNow(),
    //   });

    //   // Advertiser credit (optional)
    //   if (formData.advertiserName) {
    //     await bumpAdvertiser(formData.advertiserName);
    //   }

    //   // Trigger download (replace with your real file)
    //   if(formData.system === "Linux") {downloadFile("/downloads/CustomLinux.zip", "CustomLinux.zip");}
    //   else if(formData.system === "Windows") {downloadFile("/downloads/CustomWindows.zip", "CustomWindows.zip");}
    //   else {downloadFile("/downloads/CustomMac.zip", "CustomMac.zip");}

      
    //   localStorage.removeItem("pendingRegistration"); 
    //   setStep("done");
     } catch (err: any) {
       setError("Error: " + (err?.message || String(err)));
       setStep("error");
     }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    saveSessionData();
    setStep("loginPay");
    setError("");
    setPaymentContext("login")

    try {
      setChargeAmount(20);
      setShowPaymentModal(true);  // <-- show modal
      setPaymentSuccess(false);

      // const auth = getAuth();
      // const userCredential = await signInWithEmailAndPassword(
      //   auth,
      //   formData.email.trim(),
      //   formData.password
      // );
      // const user = userCredential.user;

      // const userRef = doc(db, "users", user.uid);
      // const snap = await getDoc(userRef);
      // if (!snap.exists()) throw new Error("User record not found.");

      // const data = snap.data() || {};

      // // Check expiry
      // const now = Timestamp.now();
      // let needsPayment = true;
      // if (data.expiresAt && data.expiresAt.toMillis() > now.toMillis()) {
      //   // Account still active, optionally ask if user wants to renew
      //   needsPayment = true; // or false if auto-free renewal
      // }

      // if (needsPayment) {
      //   // Determine charge amount
      //   let chargeAmount = 20;
      //   if ((data.student || data.teacher) && isWaiverValid()) chargeAmount = 10;

      //   await handleCheckout(chargeAmount)

      //   // const paymentSuccess = await chargeUser(chargeAmount, {email: formData.email.trim()});
      //   // if (!paymentSuccess) throw new Error("Payment failed.");
      // }

      // // Update expiry
      // await setDoc(userRef, { expiresAt: oneYearFromNow() }, { merge: true });

      // // Optional advertiser increment
      // if (formData.advertiserName) await bumpAdvertiser(formData.advertiserName);

      // // Trigger download
      // if(formData.system === "Linux") {downloadFile("/downloads/CustomLinux.zip", "CustomLinux.zip");}
      // else if(formData.system === "Windows") {downloadFile("/downloads/CustomWindows.zip", "CustomWindows.zip");}
      // else {downloadFile("/downloads/CustomMac.zip", "CustomMac.zip");}
      // localStorage.removeItem("pendingRegistration");
      // setStep("done");
    } catch (err: any) {
      setError("Login failed: " + (err?.message || String(err)));
      setStep("error");
    }
  };


  return (

    <div className="max-w-7xl mx-auto w-full px-6 py-10 space-y-12">
    <section className="bg-white rounded-2xl shadow p-8 md:p-10">
      <div className="relative bg-gradient-to-r from-indigo-900 via-gray-900 to-indigo-900 rounded-2xl">
  <div className="mx-auto max-w-7xl px-6 py-16 text-center sm:py-24 lg:py-32">
    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
      Welcome to <span className="text-indigo-400">CustoMLearning</span>!!
    </h1>
    <p className="mt-6 text-lg text-gray-200 max-w-3xl mx-auto">
      Explore and master machine learning with interactive lessons, hands-on datasets, and do-it-yourself activities — all without advanced coding knowledge.
      <br />
      Register below or continue your existing account to renew access! Subscription is just{" "}
      <span className="font-semibold text-white">$20/year</span>, or less with a promo code.
    </p>
    
  </div>
</div>


      {/* Hero / Intro */}
        {/* Registration / Login Cards */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          {/* Register */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-indigo-900">New here? Register & Pay</h2>
            <p className="text-sm text-indigo-800 mt-1">
              Create an account and get 1 year of access for just $20.
            </p>

            {step === "form" && (
              <form onSubmit={handleRegister} className="mt-4 space-y-4">

                <select
                    value={formData.system}
                    onChange={(e) => setFormData({ ...formData, system: e.target.value })}
                    required
                    className="border rounded-lg p-2 w-full"
                  >
                    <option value="Mac">Mac</option>
                    <option value="Windows">Windows</option>
                    <option value="Linux">Linux</option>
                  </select>

                <div>
                  <label className="block font-medium mb-1">I am a</label>
                  <select
                    value={formData.userType}
                    onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                    required
                    className="border rounded-lg p-2 w-full"
                  >
                    <option value="individual">Individual</option>
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                  </select>
                </div>

                {(formData.userType === "teacher" || formData.userType === "student") && (
                  <div>
                    <label className="block font-medium mb-1">Class Code</label>
                    <input
                      type="text"
                      value={formData.classCode}
                      onChange={(e) => setFormData({ ...formData, classCode: e.target.value })}
                      className="border rounded-lg p-2 w-full"
                      placeholder="Enter your class code"
                    />
                  </div>
                )}

                {formData.userType === "student" && (
                  <div>
                    <label className="block font-medium mb-1">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="border rounded-lg p-2 w-full"
                      placeholder="Your name"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-medium mb-1">Email (username)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="border rounded-lg p-2 w-full"
                    placeholder="name@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="border rounded-lg p-2 w-full"
                    placeholder="Choose a password"
                    required
                  />
                </div>

                {(formData.userType === "teacher" || formData.userType === "student") && (
                  <div>
                    <label className="block font-medium mb-1">Waiver Code (optional)</label>
                    <input
                      type="text"
                      value={formData.waiverCode}
                      onChange={(e) => setFormData({ ...formData, waiverCode: e.target.value })}
                      className="border rounded-lg p-2 w-full"
                      placeholder="WAIVER2025"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-medium mb-1">
                    If you heard about CustoMLearning from one of our salespeople, what is their first name, no spaces/capitals? (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.advertiserName}
                    onChange={(e) => setFormData({ ...formData, advertiserName: e.target.value })}
                    className="border rounded-lg p-2 w-full"
                    placeholder="e.g. alex"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg w-full"
                  >
                    Register & Pay
                  </button>
                </div>
              </form>
            )}

            {step === "paying" && (
              <p className="mt-4 text-indigo-900 font-medium">Processing payment...</p>
            )}
          </div>

          {/* Login / Renew */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Continue Existing Account</h2>
            <p className="text-sm text-gray-600 mt-1">
              Log in to renew your access for another year.
            </p>

            {step === "loginForm" && (

              <form onSubmit={handleLogin} className="mt-4 space-y-4">

                <select
                    value={formData.system}
                    onChange={(e) => setFormData({ ...formData, system: e.target.value })}
                    required
                    className="border rounded-lg p-2 w-full"
                  >
                    <option value="Mac">Mac</option>
                    <option value="Windows">Windows</option>
                    <option value="Linux">Linux</option>
                  </select>

                <div>
                  <label className="block font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="border rounded-lg p-2 w-full"
                    placeholder="name@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="border rounded-lg p-2 w-full"
                    placeholder="Your password"
                    required
                  />
                </div>


                <div>
                  <label className="block font-medium mb-1">
                    If a salesperson referred you, their first name (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.advertiserName}
                    onChange={(e) => setFormData({ ...formData, advertiserName: e.target.value })}
                    className="border rounded-lg p-2 w-full"
                    placeholder="e.g. alex"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center bg-gray-900 hover:bg-black text-white font-semibold px-4 py-2 rounded-lg w-full"
                  >
                    Login & Renew
                  </button>
                </div>
              </form>
            )}

            {step === "loginPay" && (
              <p className="mt-4 text-gray-900 font-medium">Logging in and processing payment...</p>
            )}

            {step === "form" && (
              <button
                onClick={() => setStep("loginForm")}
                className="mt-4 inline-flex items-center justify-center border border-gray-300 hover:bg-gray-50 text-gray-800 font-semibold px-4 py-2 rounded-lg w-full"
              >
                Continue Existing Account
              </button>
            )}

            {step === "loginForm" && (
              <button
                onClick={() => setStep("form")}
                className="mt-3 inline-flex items-center justify-center text-indigo-700 hover:text-indigo-900 font-semibold px-4 py-2 rounded-lg w-full"
              >
                Back to Registration
              </button>
            )}
          </div>
        </div>

        {/* Status */}
        {/* Conditional Payment Modal */}
        {showPaymentModal && (
          <PaymentModal
            email={formData.email}
            amount={chargeAmount}
            onSuccess={() => setPaymentSuccess(true)}
            onError={(msg) => { setError(msg); setStep("error"); setShowPaymentModal(false); }}
            onClose={() => {setShowPaymentModal(false); setStep("form")}}
          />
        )}


        {step === "done" && (
          <p className="mt-6 text-green-700 font-semibold">
            Thank you! Your download should begin shortly.
          </p>
        )}
        {step === "error" && (
          <p className="mt-6 text-red-600 font-semibold">{error}</p>
        )}
      </section>

      {/* Promo Rows */}
      <section className="space-y-10">
        {/* Row 1: image left */}
        <div className="grid md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-7">
            <img
              src="/ads/create2.png"
              alt="Learn visually"
              className="w-full h-200 object-cover rounded-xl shadow"
            />
          </div>
          <div className="md:col-span-5">
            <h3 className="text-2xl font-bold text-gray-900">Learn by Doing</h3>
            <p className="mt-2 text-gray-600">
              CustoMLearning features an interactive Create page where you can create real ML networks from scratch.
              Customize different features, pick your own model types and structure, and make AI to evaluate CSV files and image folders!
              Models and evaluation graphs are saved to your device, and all of your projects are tracked for your convenience.
            </p>
          </div>
        </div>

        {/* Row 2: image right */}
        <div className="grid md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-7 order-2 md:order-1">
            <h3 className="text-2xl font-bold text-gray-900">Real-World Data and Testing</h3>
            <p className="mt-2 text-gray-600">
              Work with our datasets to see how what you learn impacts the real world, or find your own data to conduct research on.
              An interactive Testing module allows for you to make real-time inferences simply by uploading your model and choice of data.
            </p>
          </div>
          <div className="md:col-span-5 order-1 md:order-2">
            <img
              src="/ads/test.png"
              alt="Real datasets"
              className="w-full h-85 object-cover rounded-xl shadow"
            />
          </div>
        </div>

        {/* Row 3: image left */}
        <div className="grid md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-7">
            <img
              src="/ads/learn.png"
              alt="Progress tracking"
              className="w-full h-81 object-cover rounded-xl shadow"
            />
          </div>
          <div className="md:col-span-5">
            <h3 className="text-2xl font-bold text-gray-900">Explore Our Curriculum and Track Your Progress</h3>
            <p className="mt-2 text-gray-600">
              Establish an in-depth understanding of AI through our curriculum that will serve you years in the future. See module scores, retakes, and milestones at a glance.
              Pick up right where you left off—on any device that has CustoMLearning downloaded.
            </p>
          </div>
        </div>

        {/* Row 4: image right */}
        <div className="grid md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-7 order-2 md:order-1">
            <h3 className="text-2xl font-bold text-gray-900">Reports for Teachers</h3>
            <p className="mt-2 text-gray-600">
              Teachers can view student progress on modules or keep tabs on student projects. Organize by student or by quiz, and monitor as large a class as desired.
            </p>
          </div>
          <div className="md:col-span-5 order-1 md:order-2">
            <img
              src="/ads/report.png"
              alt="Teacher page"
              className="w-full h-80 object-cover rounded-xl shadow"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
