import { useMemo, useState } from "react";
import { useIncomeStreams } from "../../hooks/useIncomeStreams.js";
import { useExpenses } from "../../hooks/useExpenses.js";
import { ToNumber, FormatCurrency } from "../../lib/format.js";

export function AllocationsPage() {
  const { incomeStreams } = useIncomeStreams();
  const { expenses } = useExpenses({ tableKey: "allocations:summary" });
  const [manualAllocations, setManualAllocations] = useState([
    { Key: "Splurge - Kev", Percent: 5.11 },
    { Key: "Splurge - Bee", Percent: 5.11 },
    { Key: "Smile", Percent: 10 },
    { Key: "Fire Extinguisher", Percent: 20.82 }
  ]);
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitTargets, setSplitTargets] = useState([]);
  const [splitDraft, setSplitDraft] = useState(null);
  const typeColWidth = "200px";
  const percentColWidth = "120px";
  const periodColWidth = "130px";
  const roundedColWidth = "160px";
  const percentTo100ColWidth = "120px";

  const totals = useMemo(() => {
    const incomeTotals = incomeStreams.reduce(
      (acc, stream) => {
        acc.PerDay += ToNumber(stream.NetPerDay);
        acc.PerWeek += ToNumber(stream.NetPerWeek);
        acc.PerFortnight += ToNumber(stream.NetPerFortnight);
        acc.PerMonth += ToNumber(stream.NetPerMonth);
        acc.PerYear += ToNumber(stream.NetPerYear);
        return acc;
      },
      { PerDay: 0, PerWeek: 0, PerFortnight: 0, PerMonth: 0, PerYear: 0 }
    );

    const expenseTotals = expenses.reduce(
      (acc, expense) => {
        if (!expense.Enabled) {
          return acc;
        }
        acc.PerDay += ToNumber(expense.PerDay);
        acc.PerWeek += ToNumber(expense.PerWeek);
        acc.PerFortnight += ToNumber(expense.PerFortnight);
        acc.PerMonth += ToNumber(expense.PerMonth);
        acc.PerYear += ToNumber(expense.PerYear);
        return acc;
      },
      { PerDay: 0, PerWeek: 0, PerFortnight: 0, PerMonth: 0, PerYear: 0 }
    );

    return {
      Income: incomeTotals,
      Expenses: expenseTotals,
      Difference: {
        PerDay: incomeTotals.PerDay - expenseTotals.PerDay,
        PerWeek: incomeTotals.PerWeek - expenseTotals.PerWeek,
        PerFortnight: incomeTotals.PerFortnight - expenseTotals.PerFortnight,
        PerMonth: incomeTotals.PerMonth - expenseTotals.PerMonth,
        PerYear: incomeTotals.PerYear - expenseTotals.PerYear
      }
    };
  }, [incomeStreams, expenses]);

  const baseAllocationSummary = useMemo(() => {
    const incomePerFortnight = totals.Income.PerFortnight || 0;
    const targetExpenseAllocation = incomePerFortnight
      ? totals.Expenses.PerFortnight / incomePerFortnight
      : 0;
    const manualTotal = manualAllocations.reduce(
      (sum, entry) => sum + ToNumber(entry.Percent) / 100,
      0
    );
    const totalAllocated = targetExpenseAllocation + manualTotal;
    const leftover = Math.max(0, 1 - totalAllocated);
    return {
      TargetExpenseAllocation: targetExpenseAllocation,
      TotalAllocated: totalAllocated,
      Leftover: leftover
    };
  }, [manualAllocations, totals]);

  const allocationSummary = useMemo(() => {
    const activeAllocations = splitDraft && splitTargets.length ? splitDraft : manualAllocations;
    const incomePerFortnight = totals.Income.PerFortnight || 0;
    const targetExpenseAllocation = incomePerFortnight
      ? totals.Expenses.PerFortnight / incomePerFortnight
      : 0;
    const manualTotal = activeAllocations.reduce(
      (sum, entry) => sum + ToNumber(entry.Percent) / 100,
      0
    );
    const totalAllocated = targetExpenseAllocation + manualTotal;
    const leftover = Math.max(0, 1 - totalAllocated);

    const buildRow = (name, percent) => {
      const perDay = totals.Income.PerDay * percent;
      const perWeek = totals.Income.PerWeek * percent;
      const perFortnight = totals.Income.PerFortnight * percent;
      const perMonth = totals.Income.PerMonth * percent;
      const perYear = totals.Income.PerYear * percent;
      const roundedFortnight = Math.round(perFortnight);
      const percentTo100 = incomePerFortnight ? roundedFortnight / incomePerFortnight : 0;
      return {
        Name: name,
        Percent: percent,
        PerDay: perDay,
        PerWeek: perWeek,
        PerFortnight: perFortnight,
        PerMonth: perMonth,
        PerYear: perYear,
        RoundedFortnight: roundedFortnight,
        PercentTo100: percentTo100
      };
    };

    const rows = [
      buildRow("Leftover", leftover),
      buildRow("Daily Expenses", targetExpenseAllocation),
      ...activeAllocations.map((entry) => buildRow(entry.Key, ToNumber(entry.Percent) / 100))
    ];

    const totalRounded = rows
      .filter((row) => row.Name !== "Leftover")
      .reduce((sum, row) => sum + row.RoundedFortnight, 0);

    return {
      TargetExpenseAllocation: targetExpenseAllocation,
      TotalAllocated: totalAllocated,
      Leftover: leftover,
      Rows: rows,
      TotalRow: buildRow("Total allocated", totalAllocated),
      TotalRounded: totalRounded,
      TotalRoundedPercent: incomePerFortnight ? totalRounded / incomePerFortnight : 0
    };
  }, [manualAllocations, splitDraft, splitTargets.length, totals]);

  const FormatPercent = (value) => `${(value * 100).toFixed(2)}%`;
  const manualKeys = manualAllocations.map((entry) => entry.Key);

  const ApplySplitDraft = () => {
    if (!splitDraft || splitDraft.length === 0) {
      setSplitOpen(false);
      setSplitTargets([]);
      setSplitDraft(null);
      return;
    }
    setManualAllocations(splitDraft);
    setSplitOpen(false);
    setSplitTargets([]);
    setSplitDraft(null);
  };

  const CancelSplitDraft = () => {
    setSplitOpen(false);
    setSplitTargets([]);
    setSplitDraft(null);
  };

  const UpdateSplitDraft = (nextTargets) => {
    setSplitTargets(nextTargets);
    if (nextTargets.length === 0) {
      setSplitDraft(null);
      return;
    }
    const extraShare = (baseAllocationSummary.Leftover * 100) / nextTargets.length;
    const nextDraft = manualAllocations.map((entry) =>
      nextTargets.includes(entry.Key)
        ? { ...entry, Percent: Number(entry.Percent) + extraShare }
        : entry
    );
    setSplitDraft(nextDraft);
  };

  return (
    <div className="rounded-3xl border border-ink/10 bg-white/95 p-5 text-ink shadow-glow backdrop-blur dark:border-sand/10 dark:bg-[#141311]/95 dark:text-sand">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-ink/50 dark:text-sand/60">
            Allocations
          </p>
          <h2 className="font-display text-2xl">Income vs expenses</h2>
        </div>
      </div>

      <div className="mt-4 overflow-auto rounded-2xl border border-ink/10 dark:border-sand/10">
        <table className="w-full min-w-[1050px] table-fixed text-left text-xs">
          <colgroup>
            <col style={{ width: typeColWidth }} />
            <col style={{ width: periodColWidth }} />
            <col style={{ width: periodColWidth }} />
            <col style={{ width: periodColWidth }} />
            <col style={{ width: periodColWidth }} />
            <col style={{ width: periodColWidth }} />
          </colgroup>
          <thead className="bg-ink/5 text-ink/70 dark:bg-sand/10 dark:text-sand/70">
            <tr>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Per day</th>
              <th className="px-3 py-2">Per week</th>
              <th className="px-3 py-2 bg-ember/10">Per fortnight</th>
              <th className="px-3 py-2">Per month</th>
              <th className="px-3 py-2">Per year</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10 dark:divide-sand/10">
            <tr>
              <td className="px-3 py-2 font-semibold">Income</td>
              <td className="px-3 py-2">{FormatCurrency(totals.Income.PerDay)}</td>
              <td className="px-3 py-2">{FormatCurrency(totals.Income.PerWeek)}</td>
              <td className="px-3 py-2 bg-ember/10">{FormatCurrency(totals.Income.PerFortnight)}</td>
              <td className="px-3 py-2">{FormatCurrency(totals.Income.PerMonth)}</td>
              <td className="px-3 py-2">{FormatCurrency(totals.Income.PerYear)}</td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-semibold">Expenses</td>
              <td className="px-3 py-2">{FormatCurrency(totals.Expenses.PerDay)}</td>
              <td className="px-3 py-2">{FormatCurrency(totals.Expenses.PerWeek)}</td>
              <td className="px-3 py-2 bg-ember/10">{FormatCurrency(totals.Expenses.PerFortnight)}</td>
              <td className="px-3 py-2">{FormatCurrency(totals.Expenses.PerMonth)}</td>
              <td className="px-3 py-2">{FormatCurrency(totals.Expenses.PerYear)}</td>
            </tr>
            <tr className="bg-ink/5 font-semibold dark:bg-sand/10">
              <td className="px-3 py-2">Difference</td>
              <td className="px-3 py-2">{FormatCurrency(totals.Difference.PerDay)}</td>
              <td className="px-3 py-2">{FormatCurrency(totals.Difference.PerWeek)}</td>
              <td className="px-3 py-2 bg-ember/10">{FormatCurrency(totals.Difference.PerFortnight)}</td>
              <td className="px-3 py-2">{FormatCurrency(totals.Difference.PerMonth)}</td>
              <td className="px-3 py-2">{FormatCurrency(totals.Difference.PerYear)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-2xl border border-ink/10 bg-ink/5 p-4 text-xs text-ink/70 dark:border-sand/10 dark:bg-sand/10 dark:text-sand/70">
        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-ink/50 dark:text-sand/60">
              Target expense allocation
            </div>
            <div className="mt-1 text-sm font-semibold text-ink dark:text-sand">
              {FormatPercent(allocationSummary.TargetExpenseAllocation)}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-ink/50 dark:text-sand/60">
              Total allocated
            </div>
            <div className="mt-1 text-sm font-semibold text-ink dark:text-sand">
              {FormatPercent(allocationSummary.TotalAllocated)}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-ink/50 dark:text-sand/60">
              Leftover
            </div>
            <div className="mt-1 text-sm font-semibold text-ink dark:text-sand">
              {FormatPercent(allocationSummary.Leftover)}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="text-[11px] text-ink/50 dark:text-sand/60">
            Split leftover across target accounts.
          </div>
          <button
            type="button"
            className="rounded-full border border-ink/20 px-3 py-1 text-xs dark:border-sand/30"
            onClick={() => {
              setSplitOpen(true);
              setSplitDraft(null);
              setSplitTargets([]);
            }}
          >
            Split leftover
          </button>
        </div>
      </div>

      {splitOpen ? (
        <div className="mt-4 rounded-2xl border border-ink/10 bg-white/95 p-4 text-xs text-ink/70 shadow-glow dark:border-sand/10 dark:bg-[#141311]/95 dark:text-sand/70">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60 dark:text-sand/60">
              Split leftover
            </div>
            <span className="text-[11px] text-ink/50 dark:text-sand/60">
              Leftover {FormatPercent(baseAllocationSummary.Leftover)}
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {manualKeys.map((key) => (
              <label key={key} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={splitTargets.includes(key)}
                  onChange={(event) => {
                    if (event.target.checked) {
                      UpdateSplitDraft([...splitTargets, key]);
                    } else {
                      UpdateSplitDraft(splitTargets.filter((item) => item !== key));
                    }
                  }}
                />
                {key}
              </label>
            ))}
          </div>
          {splitDraft && splitTargets.length ? (
            <div className="mt-3 text-[11px] text-ink/60 dark:text-sand/60">
              Each selected account receives an extra{" "}
              {FormatPercent(baseAllocationSummary.Leftover / splitTargets.length)}.
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-full border border-ink/20 px-3 py-1 text-xs dark:border-sand/30"
              onClick={CancelSplitDraft}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-full bg-moss px-3 py-1 text-xs font-semibold text-white"
              onClick={ApplySplitDraft}
              disabled={!splitDraft || splitTargets.length === 0}
            >
              Save split
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 overflow-auto rounded-2xl border border-ink/10 dark:border-sand/10">
        <table className="w-full min-w-[1270px] table-fixed text-left text-xs">
          <colgroup>
            <col style={{ width: typeColWidth }} />
            <col style={{ width: percentColWidth }} />
            <col style={{ width: periodColWidth }} />
            <col style={{ width: periodColWidth }} />
            <col style={{ width: periodColWidth }} />
            <col style={{ width: periodColWidth }} />
            <col style={{ width: periodColWidth }} />
            <col style={{ width: roundedColWidth }} />
            <col style={{ width: percentTo100ColWidth }} />
          </colgroup>
          <thead className="bg-ink/5 text-ink/70 dark:bg-sand/10 dark:text-sand/70">
            <tr>
              <th className="px-3 py-2">Account</th>
              <th className="px-3 py-2">% Allocation</th>
              <th className="px-3 py-2">Per day</th>
              <th className="px-3 py-2">Per week</th>
              <th className="px-3 py-2 bg-ember/10">Per fortnight</th>
              <th className="px-3 py-2">Per month</th>
              <th className="px-3 py-2">Per year</th>
              <th className="px-3 py-2 bg-ember/10">Rounded per fortnight</th>
              <th className="px-3 py-2">% to 100%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10 dark:divide-sand/10">
            {allocationSummary.Rows.map((row) => {
              const manualIndex = manualAllocations.findIndex((entry) => entry.Key === row.Name);
              const isManual = manualIndex !== -1;
              const sourceAllocations = splitDraft && splitTargets.length ? splitDraft : manualAllocations;
              const manualValue = isManual ? sourceAllocations[manualIndex]?.Percent : null;
              return (
                <tr key={row.Name} className={row.Name === "Daily Expenses" ? "bg-ink/5 dark:bg-sand/10" : ""}>
                  <td className="px-3 py-2 font-semibold">{row.Name}</td>
                  <td className="px-3 py-2">
                    {isManual ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={manualValue ?? 0}
                        onChange={(event) => {
                          const value = event.target.value;
                          setManualAllocations((current) =>
                            current.map((entry, index) =>
                              index === manualIndex ? { ...entry, Percent: value } : entry
                            )
                          );
                        }}
                        className="w-full rounded-md border border-ink/15 bg-white px-2 py-1 text-xs text-ink dark:border-sand/20 dark:bg-[#0f0e0c] dark:text-sand"
                      />
                    ) : (
                      <span>{FormatPercent(row.Percent)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{FormatCurrency(row.PerDay)}</td>
                  <td className="px-3 py-2">{FormatCurrency(row.PerWeek)}</td>
                  <td className="px-3 py-2 bg-ember/10">{FormatCurrency(row.PerFortnight)}</td>
                  <td className="px-3 py-2">{FormatCurrency(row.PerMonth)}</td>
                  <td className="px-3 py-2">{FormatCurrency(row.PerYear)}</td>
                  <td className="px-3 py-2 bg-ember/10">{FormatCurrency(row.RoundedFortnight)}</td>
                  <td className="px-3 py-2">{FormatPercent(row.PercentTo100)}</td>
                </tr>
              );
            })}
            <tr className="bg-ink/5 font-semibold dark:bg-sand/10">
              <td className="px-3 py-2">Total allocated</td>
              <td className="px-3 py-2">{FormatPercent(allocationSummary.TotalAllocated)}</td>
              <td className="px-3 py-2">{FormatCurrency(allocationSummary.TotalRow.PerDay)}</td>
              <td className="px-3 py-2">{FormatCurrency(allocationSummary.TotalRow.PerWeek)}</td>
              <td className="px-3 py-2 bg-ember/10">
                {FormatCurrency(allocationSummary.TotalRow.PerFortnight)}
              </td>
              <td className="px-3 py-2">{FormatCurrency(allocationSummary.TotalRow.PerMonth)}</td>
              <td className="px-3 py-2">{FormatCurrency(allocationSummary.TotalRow.PerYear)}</td>
              <td className="px-3 py-2 bg-ember/10">{FormatCurrency(allocationSummary.TotalRounded)}</td>
              <td className="px-3 py-2">{FormatPercent(allocationSummary.TotalRoundedPercent)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
