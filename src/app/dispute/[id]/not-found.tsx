import Link from "next/link";

export default function DisputeNotFound() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 text-center">
      <div className="space-y-6">
        {/* Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-4xl">
          🔍
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-950">Dispute not found</h1>
          <p className="mx-auto max-w-sm text-slate-500">
            This dispute report doesn&apos;t exist or may have been removed. The link
            might be incorrect.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-blue-700"
          >
            ← Calculate a fare
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            View analytics
          </Link>
        </div>

        {/* Help text */}
        <p className="text-xs text-slate-400">
          Dispute IDs are UUIDs, e.g.{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600">
            3f7a2b1c-…
          </code>
        </p>
      </div>
    </main>
  );
}
