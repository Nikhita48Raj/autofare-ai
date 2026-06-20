import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 sm:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-10 shadow-soft backdrop-blur-sm sm:p-12">
          <div className="space-y-6">
            <span className="inline-flex rounded-full bg-blue-100 px-4 py-1 text-sm font-semibold text-blue-700">
              Phase 1: Setup complete
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              AutoFare — estimate fair auto-rickshaw fares faster.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              Enter pickup and drop locations, compare official and street fare estimates, and build trust with crowdsourced reports across Indian cities.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button className="rounded-full px-6 py-3" size="lg">
                Start estimating fares
              </Button>
              <Button variant="outline" className="rounded-full px-6 py-3" size="lg">
                Explore roadmap
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-6 shadow-soft">
            <h2 className="text-xl font-semibold text-slate-900">Modern stack</h2>
            <p className="mt-3 text-slate-600">
              Next.js 15, TypeScript, Tailwind CSS, shadcn UI, and Supabase give us a production-ready starting point for AutoFare.
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-6 shadow-soft">
            <h2 className="text-xl font-semibold text-slate-900">Maps & fares</h2>
            <p className="mt-3 text-slate-600">
              We will integrate Google Maps for pickup/drop search and distance calculation, then compute official and street fare estimates.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
