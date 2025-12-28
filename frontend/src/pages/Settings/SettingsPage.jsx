import { useEffect, useMemo, useRef, useState } from "react";
import { icons } from "../../components/icons.jsx";
import { useSettings } from "../../contexts/SettingsContext.jsx";
import { useExpenses } from "../../hooks/useExpenses.js";

export function SettingsPage() {
  const {
    theme,
    setTheme,
    layoutMode,
    setLayoutMode,
    showDecimals,
    setShowDecimals,
    defaultSuperRate,
    setDefaultSuperRate
  } = useSettings();
  const [isCompactAuto, setIsCompactAuto] = useState(false);
  const [expenseAccountName, setExpenseAccountName] = useState("");
  const [expenseTypeName, setExpenseTypeName] = useState("");
  const expenseAccountOriginalRef = useRef({});
  const expenseTypeOriginalRef = useRef({});

  useEffect(() => {
    const updateSize = () => {
      setIsCompactAuto(window.innerWidth <= 1024);
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const expenseTableLayout =
    layoutMode === "auto" ? (isCompactAuto ? "compact" : "desktop") : layoutMode;
  const expenseTableKey = `expenses:${expenseTableLayout}`;

  const {
    expenses,
    setExpenses,
    expenseAccounts,
    setExpenseAccounts,
    expenseTypes,
    setExpenseTypes,
    createExpenseAccount,
    updateExpenseAccount,
    deleteExpenseAccount,
    createExpenseType,
    updateExpenseType,
    deleteExpenseType,
    expenseTableState,
    setExpenseTableState
  } = useExpenses({ tableKey: expenseTableKey });

  const expenseAccountUsage = useMemo(() => {
    return expenses.reduce((acc, expense) => {
      if (expense.Account) {
        acc[expense.Account] = (acc[expense.Account] || 0) + 1;
      }
      return acc;
    }, {});
  }, [expenses]);

  const expenseTypeUsage = useMemo(() => {
    return expenses.reduce((acc, expense) => {
      if (expense.Type) {
        acc[expense.Type] = (acc[expense.Type] || 0) + 1;
      }
      return acc;
    }, {});
  }, [expenses]);

  const AddExpenseAccount = async () => {
    if (!expenseAccountName.trim()) {
      return;
    }
    await createExpenseAccount({
      Name: expenseAccountName.trim(),
      Enabled: true
    });
    setExpenseAccountName("");
  };

  const RenameExpenseAccount = async (accountId, newName, originalName, enabled) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      return;
    }
    if (trimmed === originalName) {
      return;
    }
    const updated = await updateExpenseAccount(accountId, {
      Name: trimmed,
      Enabled: enabled
    });
    setExpenses((current) =>
      current.map((expense) =>
        expense.Account === originalName ? { ...expense, Account: updated.Name } : expense
      )
    );
  };

  const ToggleExpenseAccountEnabled = async (account) => {
    await updateExpenseAccount(account.Id, {
      Name: account.Name,
      Enabled: !account.Enabled
    });
  };

  const RemoveExpenseAccount = async (accountId) => {
    await deleteExpenseAccount(accountId);
  };

  const AddExpenseType = async () => {
    if (!expenseTypeName.trim()) {
      return;
    }
    await createExpenseType({
      Name: expenseTypeName.trim(),
      Enabled: true
    });
    setExpenseTypeName("");
  };

  const RenameExpenseType = async (typeId, newName, originalName, enabled) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      return;
    }
    if (trimmed === originalName) {
      return;
    }
    const updated = await updateExpenseType(typeId, {
      Name: trimmed,
      Enabled: enabled
    });
    setExpenses((current) =>
      current.map((expense) =>
        expense.Type === originalName ? { ...expense, Type: updated.Name } : expense
      )
    );
  };

  const ToggleExpenseTypeEnabled = async (entry) => {
    await updateExpenseType(entry.Id, {
      Name: entry.Name,
      Enabled: !entry.Enabled
    });
  };

  const RemoveExpenseType = async (typeId) => {
    await deleteExpenseType(typeId);
  };

  const ToggleExpenseColumnVisibility = (key) => {
    const column = expenseTableState.Columns.find((item) => item.Key === key);
    if (column?.Locked) {
      return;
    }
    setExpenseTableState((current) => ({
      ...current,
      Columns: current.Columns.map((item) =>
        item.Key === key ? { ...item, Visible: item.Visible === false } : item
      )
    }));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <details className="rounded-3xl border border-ink/10 bg-white/95 p-5 shadow-glow backdrop-blur dark:border-sand/10 dark:bg-[#141311]/95">
        <summary className="flex cursor-pointer items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60 dark:text-sand/60">
              Layout
            </div>
            <div className="text-sm text-ink/60 dark:text-sand/60">
              {layoutMode === "auto"
                ? "Auto layout"
                : layoutMode === "desktop"
                  ? "Desktop layout"
                  : "Compact layout"}
            </div>
          </div>
          <span className="text-ink/40 dark:text-sand/40">{icons.chevronDown}</span>
        </summary>
        <div className="mt-4 grid gap-2 text-sm">
          {[
            { value: "auto", label: "Auto layout" },
            { value: "desktop", label: "Desktop layout" },
            { value: "compact", label: "Compact layout" }
          ].map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={layoutMode === option.value}
                onChange={() => setLayoutMode(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </details>

      <details className="rounded-3xl border border-ink/10 bg-white/95 p-5 shadow-glow backdrop-blur dark:border-sand/10 dark:bg-[#141311]/95">
        <summary className="flex cursor-pointer items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60 dark:text-sand/60">
              Theme
            </div>
            <div className="text-sm text-ink/60 dark:text-sand/60">
              {theme === "light" ? "Light mode" : "Dark mode"}
            </div>
          </div>
          <span className="text-ink/40 dark:text-sand/40">{icons.chevronDown}</span>
        </summary>
        <div className="mt-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={theme === "dark"}
              onChange={() => setTheme(theme === "light" ? "dark" : "light")}
            />
            Dark mode
          </label>
        </div>
      </details>

      <details className="rounded-3xl border border-ink/10 bg-white/95 p-5 shadow-glow backdrop-blur dark:border-sand/10 dark:bg-[#141311]/95">
        <summary className="flex cursor-pointer items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60 dark:text-sand/60">
              Display
            </div>
            <div className="text-sm text-ink/60 dark:text-sand/60">
              {showDecimals ? "Show decimals" : "Hide decimals"}
            </div>
          </div>
          <span className="text-ink/40 dark:text-sand/40">{icons.chevronDown}</span>
        </summary>
        <div className="mt-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showDecimals}
              onChange={(event) => setShowDecimals(event.target.checked)}
            />
            Show decimals across the app
          </label>
        </div>
      </details>

      <details className="rounded-3xl border border-ink/10 bg-white/95 p-5 shadow-glow backdrop-blur dark:border-sand/10 dark:bg-[#141311]/95">
        <summary className="flex cursor-pointer items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60 dark:text-sand/60">
              Expense columns
            </div>
            <div className="text-sm text-ink/60 dark:text-sand/60">
              {expenseTableState.Columns.filter((column) => column.Visible !== false).length} visible
            </div>
          </div>
          <span className="text-ink/40 dark:text-sand/40">{icons.chevronDown}</span>
        </summary>
        <div className="mt-4 grid gap-2 text-sm">
          {expenseTableState.Columns.map((column) => (
            <label key={column.Key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={column.Visible !== false}
                onChange={() => ToggleExpenseColumnVisibility(column.Key)}
                disabled={column.Locked}
              />
              {column.Label || column.Key}
            </label>
          ))}
        </div>
      </details>

      <details className="rounded-3xl border border-ink/10 bg-white/95 p-5 shadow-glow backdrop-blur dark:border-sand/10 dark:bg-[#141311]/95">
        <summary className="flex cursor-pointer items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60 dark:text-sand/60">
              Expense accounts
            </div>
            <div className="text-sm text-ink/60 dark:text-sand/60">
              {expenseAccounts.length} total
            </div>
          </div>
          <span className="text-ink/40 dark:text-sand/40">{icons.chevronDown}</span>
        </summary>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Add account"
              value={expenseAccountName}
              onChange={(event) => setExpenseAccountName(event.target.value)}
              className="flex-1 rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
            />
            <button
              type="button"
              className="rounded-xl border border-ink/20 px-3 py-2 text-sm dark:border-sand/30"
              onClick={AddExpenseAccount}
            >
              Add
            </button>
          </div>
          {expenseAccounts.length === 0 ? (
            <div className="text-ink/50 dark:text-sand/60">No accounts yet.</div>
          ) : (
            expenseAccounts.map((account) => (
              <div
                key={account.Id}
                className="flex items-center gap-3 rounded-xl border border-ink/10 px-3 py-2 dark:border-sand/10"
              >
                <input
                  type="checkbox"
                  checked={account.Enabled}
                  onChange={() => ToggleExpenseAccountEnabled(account)}
                  aria-label={`Toggle ${account.Name}`}
                />
                <input
                  type="text"
                  value={account.Name}
                  onChange={(event) => {
                    const value = event.target.value;
                    setExpenseAccounts((current) =>
                      current.map((item) =>
                        item.Id === account.Id ? { ...item, Name: value } : item
                      )
                    );
                  }}
                  onFocus={() => {
                    expenseAccountOriginalRef.current[account.Id] = account.Name;
                  }}
                  onBlur={(event) => {
                    const original =
                      expenseAccountOriginalRef.current[account.Id] || account.Name;
                    RenameExpenseAccount(account.Id, event.target.value, original, account.Enabled);
                  }}
                  className="flex-1 rounded-lg border border-ink/10 bg-transparent px-2 py-1 text-sm dark:border-sand/20"
                />
                <button
                  type="button"
                  className="rounded-full border border-ember/40 px-2 py-1 text-[11px] text-ember"
                  onClick={() => RemoveExpenseAccount(account.Id)}
                  disabled={expenseAccountUsage[account.Name]}
                  title={
                    expenseAccountUsage[account.Name]
                      ? "Account is used by an expense"
                      : "Delete"
                  }
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </details>

      <details className="rounded-3xl border border-ink/10 bg-white/95 p-5 shadow-glow backdrop-blur dark:border-sand/10 dark:bg-[#141311]/95">
        <summary className="flex cursor-pointer items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60 dark:text-sand/60">
              Expense types
            </div>
            <div className="text-sm text-ink/60 dark:text-sand/60">
              {expenseTypes.length} total
            </div>
          </div>
          <span className="text-ink/40 dark:text-sand/40">{icons.chevronDown}</span>
        </summary>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Add type"
              value={expenseTypeName}
              onChange={(event) => setExpenseTypeName(event.target.value)}
              className="flex-1 rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
            />
            <button
              type="button"
              className="rounded-xl border border-ink/20 px-3 py-2 text-sm dark:border-sand/30"
              onClick={AddExpenseType}
            >
              Add
            </button>
          </div>
          {expenseTypes.length === 0 ? (
            <div className="text-ink/50 dark:text-sand/60">No types yet.</div>
          ) : (
            expenseTypes.map((entry) => (
              <div
                key={entry.Id}
                className="flex items-center gap-3 rounded-xl border border-ink/10 px-3 py-2 dark:border-sand/10"
              >
                <input
                  type="checkbox"
                  checked={entry.Enabled}
                  onChange={() => ToggleExpenseTypeEnabled(entry)}
                  aria-label={`Toggle ${entry.Name}`}
                />
                <input
                  type="text"
                  value={entry.Name}
                  onChange={(event) => {
                    const value = event.target.value;
                    setExpenseTypes((current) =>
                      current.map((item) =>
                        item.Id === entry.Id ? { ...item, Name: value } : item
                      )
                    );
                  }}
                  onFocus={() => {
                    expenseTypeOriginalRef.current[entry.Id] = entry.Name;
                  }}
                  onBlur={(event) => {
                    const original = expenseTypeOriginalRef.current[entry.Id] || entry.Name;
                    RenameExpenseType(entry.Id, event.target.value, original, entry.Enabled);
                  }}
                  className="flex-1 rounded-lg border border-ink/10 bg-transparent px-2 py-1 text-sm dark:border-sand/20"
                />
                <button
                  type="button"
                  className="rounded-full border border-ember/40 px-2 py-1 text-[11px] text-ember"
                  onClick={() => RemoveExpenseType(entry.Id)}
                  disabled={expenseTypeUsage[entry.Name]}
                  title={
                    expenseTypeUsage[entry.Name] ? "Type is used by an expense" : "Delete"
                  }
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </details>

      <details className="rounded-3xl border border-ink/10 bg-white/95 p-5 shadow-glow backdrop-blur dark:border-sand/10 dark:bg-[#141311]/95">
        <summary className="flex cursor-pointer items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60 dark:text-sand/60">
              Calculator defaults
            </div>
            <div className="text-sm text-ink/60 dark:text-sand/60">
              Super rate {defaultSuperRate}%
            </div>
          </div>
          <span className="text-ink/40 dark:text-sand/40">{icons.chevronDown}</span>
        </summary>
        <div className="mt-4 text-sm">
          <label className="grid gap-1 text-[11px] text-ink/60 dark:text-sand/60">
            Default super rate
            <input
              type="number"
              min="0"
              step="0.1"
              value={defaultSuperRate}
              onChange={(event) => setDefaultSuperRate(event.target.value)}
              className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
            />
          </label>
        </div>
      </details>
    </div>
  );
}
