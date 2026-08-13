"use client";

export default function PayPanel() {
  return (
    <div className="rounded-[20px] p-8 md:p-11 grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-7 text-white bg-gradient-to-br from-[#0F2E22] to-[#1B4C38]">
      <div>
        <span className="font-mono text-[0.7rem] bg-white/10 px-3 py-1.5 rounded-full inline-block mb-3.5">
          Secure Payment
        </span>
        <h3 className="font-display text-white text-2xl mb-1.5">
          Pay school fees online, from anywhere
        </h3>
        <p className="text-[#CBE3D6] mb-0">
          No more bank branch visits or lost receipts — pay termly fees directly and get an instant confirmation.
        </p>
      </div>
      <button
        onClick={() =>
          alert("Connect this button to your live Paystack Payment Link or Checkout integration.")
        }
        className="btn btn-clay"
      >
        Pay Fees Now →
      </button>
    </div>
  );
}
