export function ExpenseModal({
  isOpen,
  mode,
  form,
  accounts,
  types,
  loading,
  onClose,
  onSubmit,
  onDelete,
  onChange,
  onToggleEnabled
}) {
  if (!isOpen) {
    return null;
  }
  const isEdit = mode === "edit";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-4 py-6">
      <div className="w-full max-w-2xl rounded-3xl border border-ink/10 bg-white p-6 shadow-2xl dark:border-sand/10 dark:bg-[#141311]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-ink/50 dark:text-sand/60">
              Expenses
            </p>
            <h3 className="font-display text-2xl">{isEdit ? "Edit expense" : "Add expense"}</h3>
          </div>
          <button
            type="button"
            className="rounded-full border border-ink/20 px-3 py-1 text-xs dark:border-sand/30"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <form
          className="mt-6 grid gap-4 md:grid-cols-2"
          onSubmit={onSubmit}
        >
          <label className="text-sm">
            Expense
            <input
              type="text"
              required
              value={form.Label}
              onChange={(event) => onChange("Label", event.target.value)}
              className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
            />
          </label>
          <label className="text-sm">
            Amount
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={form.Amount}
              onChange={(event) => onChange("Amount", event.target.value)}
              className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
            />
          </label>
          <label className="text-sm">
            Frequency
            <select
              value={form.Frequency}
              onChange={(event) => onChange("Frequency", event.target.value)}
              className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
            >
              <option>Weekly</option>
              <option>Fortnightly</option>
              <option>Monthly</option>
              <option>Quarterly</option>
              <option>Yearly</option>
            </select>
          </label>
          <label className="text-sm">
            Next due
            <input
              type="date"
              value={form.NextDueDate}
              onChange={(event) => onChange("NextDueDate", event.target.value)}
              className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
            />
          </label>
          <label className="text-sm">
            Cadence
            <select
              value={form.Cadence}
              onChange={(event) => onChange("Cadence", event.target.value)}
              className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
            >
              <option value="">Select</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Yearly">Yearly</option>
              <option value="EveryNYears">Every N years</option>
              <option value="OneOff">One-off</option>
            </select>
          </label>
          <label className="text-sm">
            Every
            <input
              type="number"
              min="1"
              value={form.Interval}
              onChange={(event) => onChange("Interval", event.target.value)}
              className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
            />
          </label>
          <label className="text-sm">
            Account
            <select
              value={form.Account}
              onChange={(event) => onChange("Account", event.target.value)}
              className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
            >
              <option value="">Select</option>
              {accounts.map((account) => (
                <option key={account.Id} value={account.Name}>
                  {account.Enabled ? account.Name : `${account.Name} (disabled)`}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Type
            <select
              value={form.Type}
              onChange={(event) => onChange("Type", event.target.value)}
              className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
            >
              <option value="">Select</option>
              {types.map((entry) => (
                <option key={entry.Id} value={entry.Name}>
                  {entry.Enabled ? entry.Name : `${entry.Name} (disabled)`}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm md:col-span-2">
            Notes
            <textarea
              value={form.Notes}
              onChange={(event) => onChange("Notes", event.target.value)}
              className="mt-2 h-24 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
            />
          </label>
          {isEdit ? (
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={form.Enabled}
                onChange={(event) => onToggleEnabled(event.target.checked)}
              />
              Enabled
            </label>
          ) : null}
          <div className="flex flex-wrap items-center justify-end gap-3 md:col-span-2">
            {isEdit ? (
              <button
                type="button"
                className="rounded-xl border border-ember/40 px-4 py-2 text-sm text-ember"
                onClick={onDelete}
                disabled={loading}
              >
                Delete
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-xl border border-ink/20 px-4 py-2 text-sm dark:border-sand/30"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-moss px-4 py-2 text-sm font-semibold text-white"
              disabled={loading}
            >
              {isEdit ? "Save changes" : "Add expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
