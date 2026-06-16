// Next.js streaming SSR fallback.
// While the route segment is loading, this skeleton is streamed
// immediately so the browser never shows a blank page.

export default function Loading() {
  return (
    <div className="min-h-screen bg-rx-gray-50 flex items-center justify-center">
      <div className="text-center" role="status" aria-live="polite">
        <div
          className="w-8 h-8 border-2 border-rx-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"
          aria-hidden="true"
        />
        <p className="text-rx-gray-500 text-sm">Loading ElevateMe Referral…</p>
      </div>
    </div>
  );
}
