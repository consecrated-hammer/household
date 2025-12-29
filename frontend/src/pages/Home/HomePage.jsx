import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-ink/10 bg-white/90 p-6 shadow-glow dark:border-sand/10 dark:bg-[#141311]/90">
        <p className="text-xs uppercase tracking-[0.3em] text-ink/50 dark:text-sand/50">
          Household
        </p>
        <h1 className="mt-3 font-display text-3xl">Your household hub</h1>
        <p className="mt-2 text-sm text-ink/60 dark:text-sand/60">
          Budgeting is the first module. Use it to track income, expenses, and allocations.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-ink/10 bg-white/90 p-6 shadow-glow dark:border-sand/10 dark:bg-[#141311]/90">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/50 dark:text-sand/50">
            Budget
          </p>
          <h2 className="mt-2 font-display text-2xl">Income and expenses</h2>
          <p className="mt-2 text-sm text-ink/60 dark:text-sand/60">
            Map income streams, track expenses, and review allocations in one place.
          </p>
          <Link
            to="/income"
            className="mt-4 inline-flex items-center rounded-full bg-ink px-4 py-2 text-sm font-semibold text-sand dark:bg-sand dark:text-ink"
          >
            Open budget
          </Link>
        </div>

        <div className="rounded-3xl border border-dashed border-ink/20 bg-white/70 p-6 text-sm text-ink/60 dark:border-sand/20 dark:bg-[#141311]/60 dark:text-sand/60">
          <p className="text-xs uppercase tracking-[0.2em]">Coming soon</p>
          <h2 className="mt-2 font-display text-2xl">Household timelines</h2>
          <p className="mt-2">Track notes, milestones, and shared tasks as they arrive.</p>
        </div>
      </section>
    </div>
  );
}
