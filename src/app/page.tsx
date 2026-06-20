import { FareCalculator } from "@/components/fare/fare-calculator";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 sm:px-10 lg:px-16">
      <div className="mx-auto w-full max-w-6xl">
        <FareCalculator />
      </div>
    </main>
  );
}
