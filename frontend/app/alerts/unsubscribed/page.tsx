import Link from "next/link";

export default function UnsubscribedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow-card p-10 text-center">
        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-[18px] font-semibold text-gray-900 mb-2">Unsubscribed</h1>
        <p className="text-[13px] text-gray-500 leading-relaxed mb-6">
          You&apos;ve been removed from this alert. You won&apos;t receive any more
          notifications for this subscription.
        </p>
        <Link
          href="/alerts"
          className="text-[12.5px] font-medium text-[#3b6cf5] hover:underline"
        >
          Back to Alerts
        </Link>
      </div>
    </div>
  );
}
