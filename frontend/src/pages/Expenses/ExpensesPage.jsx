import { useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "../../contexts/SettingsContext.jsx";
import { useExpenses } from "../../hooks/useExpenses.js";
import { ExpenseTable } from "../../components/ExpenseTable/ExpenseTable.jsx";
import { ExpenseModal } from "../../components/Modals/ExpenseModal.jsx";
import { icons } from "../../components/icons.jsx";
import { ToNumber } from "../../lib/format.js";
import { DefaultExpenseTableState } from "../../lib/expenseTable.js";

const InitialExpenseForm = {
  Label: "",
  Amount: "",
  Frequency: "Monthly",
  Account: "",
  Type: "",
  NextDueDate: "",
  Cadence: "",
  Interval: "",
  Enabled: true,
  Notes: ""
};

export function ExpensesPage() {
  const { layoutMode } = useSettings();
  const [isCompactAuto, setIsCompactAuto] = useState(false);
  const [expenseForm, setExpenseForm] = useState(InitialExpenseForm);
  const [editExpenseForm, setEditExpenseForm] = useState(InitialExpenseForm);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseModalMode, setExpenseModalMode] = useState("add");
  const [spreadsheetMode, setSpreadsheetMode] = useState(false);
  const expenseAddLabelRef = useRef(null);
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseColumnsOpen, setExpenseColumnsOpen] = useState(false);
  const [expenseFiltersOpen, setExpenseFiltersOpen] = useState(false);
  const [expenseActiveFilter, setExpenseActiveFilter] = useState(null);
  const [expenseMenuOpen, setExpenseMenuOpen] = useState(false);
  const [draggingExpenseId, setDraggingExpenseId] = useState(null);
  const [dragOverExpenseId, setDragOverExpenseId] = useState(null);
  const expenseResizeRef = useRef({ key: null, startX: 0, startWidth: 0 });

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
    expenseAccounts,
    expenseTypes,
    loading,
    createExpense,
    updateExpense,
    deleteExpense,
    updateExpenseOrder,
    expenseTableState,
    setExpenseTableState
  } = useExpenses({ tableKey: expenseTableKey });

  useEffect(() => {
    if (!expenseFiltersOpen) {
      setExpenseActiveFilter(null);
    }
  }, [expenseFiltersOpen]);

  const expenseColumnConfig = useMemo(() => {
    return expenseTableState.Columns.reduce((acc, column) => {
      acc[column.Key] = column;
      return acc;
    }, {});
  }, [expenseTableState]);

  const expenseFilters = useMemo(() => expenseTableState.Filters || {}, [expenseTableState.Filters]);

  const filteredExpenses = useMemo(() => {
    const query = expenseSearch.trim().toLowerCase();
    return expenses.filter((expense) => {
      if (expenseFilters.Frequency?.length && !expenseFilters.Frequency.includes(expense.Frequency)) {
        return false;
      }
      if (
        expenseFilters.Account?.length &&
        !expenseFilters.Account.includes(expense.Account ? expense.Account : "None")
      ) {
        return false;
      }
      if (
        expenseFilters.Type?.length &&
        !expenseFilters.Type.includes(expense.Type ? expense.Type : "None")
      ) {
        return false;
      }
      if (
        expenseFilters.Cadence?.length &&
        !expenseFilters.Cadence.includes(expense.Cadence ? expense.Cadence : "None")
      ) {
        return false;
      }
      if (expenseFilters.Enabled?.length) {
        const enabledValue = expense.Enabled ? "Enabled" : "Disabled";
        if (!expenseFilters.Enabled.includes(enabledValue)) {
          return false;
        }
      }
      if (!query) {
        return true;
      }
      const haystack = [expense.Label, expense.Account, expense.Type, expense.Cadence, expense.Notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [expenses, expenseSearch, expenseFilters]);

  const expenseTotals = useMemo(() => {
    return filteredExpenses.reduce(
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
  }, [filteredExpenses]);

  const expenseFilterOptions = useMemo(() => {
    const buildOptions = (excludeKey) => {
      return expenses.filter((expense) => {
        if (excludeKey !== "Frequency" && expenseFilters.Frequency?.length) {
          if (!expenseFilters.Frequency.includes(expense.Frequency)) {
            return false;
          }
        }
        if (excludeKey !== "Account" && expenseFilters.Account?.length) {
          const accountValue = expense.Account ? expense.Account : "None";
          if (!expenseFilters.Account.includes(accountValue)) {
            return false;
          }
        }
        if (excludeKey !== "Type" && expenseFilters.Type?.length) {
          const typeValue = expense.Type ? expense.Type : "None";
          if (!expenseFilters.Type.includes(typeValue)) {
            return false;
          }
        }
        if (excludeKey !== "Cadence" && expenseFilters.Cadence?.length) {
          const cadenceValue = expense.Cadence ? expense.Cadence : "None";
          if (!expenseFilters.Cadence.includes(cadenceValue)) {
            return false;
          }
        }
        if (excludeKey !== "Enabled" && expenseFilters.Enabled?.length) {
          const enabledValue = expense.Enabled ? "Enabled" : "Disabled";
          if (!expenseFilters.Enabled.includes(enabledValue)) {
            return false;
          }
        }
        return true;
      });
    };

    const frequencyValues = new Set();
    const accountValues = new Set();
    const typeValues = new Set();
    const cadenceValues = new Set();
    buildOptions("Frequency").forEach((expense) => frequencyValues.add(expense.Frequency));
    buildOptions("Account").forEach((expense) =>
      accountValues.add(expense.Account ? expense.Account : "None")
    );
    buildOptions("Type").forEach((expense) => typeValues.add(expense.Type ? expense.Type : "None"));
    buildOptions("Cadence").forEach((expense) =>
      cadenceValues.add(expense.Cadence ? expense.Cadence : "None")
    );
    return {
      Frequency: Array.from(frequencyValues).filter(Boolean).sort(),
      Account: Array.from(accountValues).sort(),
      Type: Array.from(typeValues).sort(),
      Cadence: Array.from(cadenceValues).sort(),
      Enabled: ["Enabled", "Disabled"]
    };
  }, [expenses, expenseFilters]);

  const sortedExpenses = useMemo(() => {
    const sortKey = expenseTableState.Sort?.Key || "Order";
    const direction = expenseTableState.Sort?.Direction === "desc" ? -1 : 1;
    const sorted = [...filteredExpenses];
    const normalize = (value) => {
      if (value === null || value === undefined) {
        return "";
      }
      if (typeof value === "number") {
        return value;
      }
      return String(value).toLowerCase();
    };
    sorted.sort((a, b) => {
      let aValue = "";
      let bValue = "";
      if (sortKey === "Order") {
        aValue = a.DisplayOrder ?? 0;
        bValue = b.DisplayOrder ?? 0;
      } else if (sortKey === "Label") {
        aValue = a.Label;
        bValue = b.Label;
      } else if (sortKey === "Amount") {
        aValue = Number(a.Amount || 0);
        bValue = Number(b.Amount || 0);
      } else if (sortKey === "Frequency") {
        aValue = a.Frequency;
        bValue = b.Frequency;
      } else if (sortKey === "Account") {
        aValue = a.Account || "";
        bValue = b.Account || "";
      } else if (sortKey === "Type") {
        aValue = a.Type || "";
        bValue = b.Type || "";
      } else if (sortKey === "PerDay") {
        aValue = Number(a.PerDay || 0);
        bValue = Number(b.PerDay || 0);
      } else if (sortKey === "PerWeek") {
        aValue = Number(a.PerWeek || 0);
        bValue = Number(b.PerWeek || 0);
      } else if (sortKey === "PerFortnight") {
        aValue = Number(a.PerFortnight || 0);
        bValue = Number(b.PerFortnight || 0);
      } else if (sortKey === "PerMonth") {
        aValue = Number(a.PerMonth || 0);
        bValue = Number(b.PerMonth || 0);
      } else if (sortKey === "PerYear") {
        aValue = Number(a.PerYear || 0);
        bValue = Number(b.PerYear || 0);
      } else if (sortKey === "NextDueDate") {
        aValue = a.NextDueDate || "";
        bValue = b.NextDueDate || "";
      } else if (sortKey === "Cadence") {
        aValue = a.Cadence || "";
        bValue = b.Cadence || "";
      } else if (sortKey === "Interval") {
        aValue = Number(a.Interval || 0);
        bValue = Number(b.Interval || 0);
      } else if (sortKey === "Enabled") {
        aValue = a.Enabled ? 1 : 0;
        bValue = b.Enabled ? 1 : 0;
      }
      if (normalize(aValue) < normalize(bValue)) {
        return -1 * direction;
      }
      if (normalize(aValue) > normalize(bValue)) {
        return 1 * direction;
      }
      return 0;
    });
    return sorted;
  }, [filteredExpenses, expenseTableState]);

  const showExpensePerDay = expenseColumnConfig.PerDay?.Visible !== false;
  const showExpensePerWeek = expenseColumnConfig.PerWeek?.Visible !== false;
  const showExpensePerFortnight = expenseColumnConfig.PerFortnight?.Visible !== false;
  const showExpensePerMonth = expenseColumnConfig.PerMonth?.Visible !== false;
  const showExpensePerYear = expenseColumnConfig.PerYear?.Visible !== false;
  const showExpenseOrder = expenseColumnConfig.Order?.Visible !== false;
  const showExpenseLabel = expenseColumnConfig.Label?.Visible !== false;
  const showExpenseAmount = expenseColumnConfig.Amount?.Visible !== false;
  const showExpenseFrequency = expenseColumnConfig.Frequency?.Visible !== false;
  const showExpenseAccount = expenseColumnConfig.Account?.Visible !== false;
  const showExpenseType = expenseColumnConfig.Type?.Visible !== false;
  const showExpenseNextDue = expenseColumnConfig.NextDueDate?.Visible !== false;
  const showExpenseCadence = expenseColumnConfig.Cadence?.Visible !== false;
  const showExpenseInterval = expenseColumnConfig.Interval?.Visible !== false;
  const expenseTotalLabelKey = showExpenseOrder
    ? "Order"
    : showExpenseLabel
      ? "Label"
      : showExpenseAmount
        ? "Amount"
        : showExpenseFrequency
          ? "Frequency"
          : showExpenseAccount
            ? "Account"
            : showExpenseType
              ? "Type"
              : null;

  const StartAddExpense = () => {
    setEditingExpenseId(null);
    setExpenseForm(InitialExpenseForm);
    setExpenseModalMode("add");
    setExpenseModalOpen(true);
  };

  const CloseExpenseModal = () => {
    if (expenseModalMode === "edit") {
      setEditingExpenseId(null);
      setEditExpenseForm(InitialExpenseForm);
    } else {
      setExpenseForm(InitialExpenseForm);
    }
    setExpenseModalOpen(false);
  };

  const StartEditExpense = (expense, openModal = true) => {
    setEditingExpenseId(expense.Id);
    setEditExpenseForm({
      Label: expense.Label,
      Amount: expense.Amount,
      Frequency: expense.Frequency,
      Account: expense.Account || "",
      Type: expense.Type || "",
      NextDueDate: expense.NextDueDate || "",
      Cadence: expense.Cadence || "",
      Interval: expense.Interval ? String(expense.Interval) : "",
      Enabled: expense.Enabled,
      Notes: expense.Notes || ""
    });
    if (openModal) {
      setExpenseModalMode("edit");
      setExpenseModalOpen(true);
    }
  };

  const HandleExpenseSubmit = async (event) => {
    event.preventDefault();
    const nextDueDate = expenseForm.NextDueDate || null;
    const payload = {
      ...expenseForm,
      Amount: Number(expenseForm.Amount),
      NextDueDate: nextDueDate,
      Cadence: expenseForm.Cadence || null,
      Interval: expenseForm.Interval ? Number(expenseForm.Interval) : null,
      Month: nextDueDate ? new Date(nextDueDate).getMonth() + 1 : null,
      DayOfMonth: nextDueDate ? new Date(nextDueDate).getDate() : null
    };
    await createExpense(payload);
    setExpenseForm(InitialExpenseForm);
    if (spreadsheetMode) {
      requestAnimationFrame(() => {
        expenseAddLabelRef.current?.focus();
      });
    }
    setExpenseModalOpen(false);
  };

  const SaveExpenseEdit = async (expenseId) => {
    const nextDueDate = editExpenseForm.NextDueDate || null;
    const payload = {
      ...editExpenseForm,
      Amount: Number(editExpenseForm.Amount),
      NextDueDate: nextDueDate,
      Cadence: editExpenseForm.Cadence || null,
      Interval: editExpenseForm.Interval ? Number(editExpenseForm.Interval) : null,
      Month: nextDueDate ? new Date(nextDueDate).getMonth() + 1 : null,
      DayOfMonth: nextDueDate ? new Date(nextDueDate).getDate() : null
    };
    await updateExpense(expenseId, payload);
    setEditingExpenseId(null);
    setEditExpenseForm(InitialExpenseForm);
    setExpenseModalOpen(false);
  };

  const CancelExpenseEdit = () => {
    if (expenseModalOpen) {
      CloseExpenseModal();
      return;
    }
    setEditingExpenseId(null);
    setEditExpenseForm(InitialExpenseForm);
  };

  const ToggleExpenseEnabled = async (expense) => {
    const payload = {
      Label: expense.Label,
      Amount: Number(expense.Amount),
      Frequency: expense.Frequency,
      Account: expense.Account,
      Type: expense.Type,
      NextDueDate: expense.NextDueDate,
      Cadence: expense.Cadence,
      Interval: expense.Interval,
      Month: expense.Month,
      DayOfMonth: expense.DayOfMonth,
      Enabled: !expense.Enabled,
      Notes: expense.Notes
    };
    await updateExpense(expense.Id, payload);
  };

  const DeleteExpenseItem = async (expenseId) => {
    await deleteExpense(expenseId);
    CloseExpenseModal();
  };

  const ToggleExpenseColumnVisibility = (key) => {
    const column = expenseColumnConfig[key];
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

  const ResetExpenseTableState = () => {
    setExpenseTableState(DefaultExpenseTableState);
  };

  const SetExpenseSort = (key) => {
    setExpenseTableState((current) => ({
      ...current,
      Sort: {
        Key: key,
        Direction:
          current.Sort?.Key === key && current.Sort?.Direction === "asc" ? "desc" : "asc"
      }
    }));
  };

  const StartExpenseColumnResize = (key, event) => {
    expenseResizeRef.current = {
      key,
      startX: event.clientX,
      startWidth: expenseColumnConfig[key]?.Width || 120
    };
    document.addEventListener("mousemove", HandleExpenseColumnResize);
    document.addEventListener("mouseup", StopExpenseColumnResize);
  };

  const HandleExpenseColumnResize = (event) => {
    const { key, startX, startWidth } = expenseResizeRef.current;
    if (!key) {
      return;
    }
    const delta = event.clientX - startX;
    const minWidth = 10;
    const nextWidth = Math.max(minWidth, startWidth + delta);
    setExpenseTableState((current) => ({
      ...current,
      Columns: current.Columns.map((column) =>
        column.Key === key ? { ...column, Width: nextWidth } : column
      )
    }));
  };

  const StopExpenseColumnResize = () => {
    expenseResizeRef.current = { key: null, startX: 0, startWidth: 0 };
    document.removeEventListener("mousemove", HandleExpenseColumnResize);
    document.removeEventListener("mouseup", StopExpenseColumnResize);
  };

  const ToggleExpenseFilterValue = (key, value) => {
    setExpenseTableState((current) => {
      const filters = current.Filters || {};
      const currentValues = filters[key] || [];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];
      return {
        ...current,
        Filters: {
          ...filters,
          [key]: nextValues
        }
      };
    });
  };

  const ClearExpenseFilters = () => {
    setExpenseTableState((current) => ({
      ...current,
      Filters: {}
    }));
  };

  const StartExpenseDrag = (expenseId, event) => {
    setDraggingExpenseId(expenseId);
    event.dataTransfer.effectAllowed = "move";
  };

  const HandleExpenseDragOver = (expenseId, event) => {
    event.preventDefault();
    if (draggingExpenseId && expenseId !== draggingExpenseId) {
      setDragOverExpenseId(expenseId);
    }
  };

  const HandleExpenseDragLeave = () => {
    setDragOverExpenseId(null);
  };

  const HandleExpenseDrop = async (expenseId, event) => {
    event.preventDefault();
    if (!draggingExpenseId || draggingExpenseId === expenseId) {
      setDragOverExpenseId(null);
      return;
    }
    const currentOrder = sortedExpenses.map((expense) => expense.Id);
    const fromIndex = currentOrder.indexOf(draggingExpenseId);
    const toIndex = currentOrder.indexOf(expenseId);
    if (fromIndex === -1 || toIndex === -1) {
      return;
    }
    const reordered = [...currentOrder];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const payload = reordered.map((id, index) => ({
      ExpenseId: id,
      DisplayOrder: index + 1
    }));
    await updateExpenseOrder(payload);
    setDragOverExpenseId(null);
    setDraggingExpenseId(null);
  };

  const TrySubmitExpense = () => {
    if (!expenseForm.Label.trim() || !expenseForm.Amount) {
      return;
    }
    HandleExpenseSubmit({ preventDefault: () => {} });
  };

  const HandleExpenseAddKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      TrySubmitExpense();
    }
  };

  const HandleExpenseEditKeyDown = (event, expenseId) => {
    if (event.key === "Enter") {
      event.preventDefault();
      SaveExpenseEdit(expenseId);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      CancelExpenseEdit();
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-14rem)] flex-col rounded-3xl border border-ink/10 bg-white/95 p-5 text-ink shadow-glow backdrop-blur dark:border-sand/10 dark:bg-[#141311]/95 dark:text-sand">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-ink/50 dark:text-sand/60">
            Expenses
          </p>
          <h2 className="font-display text-2xl">Household expenses</h2>
        </div>
        <span className="text-xs uppercase tracking-[0.3em] text-ink/50 dark:text-sand/60">
          {filteredExpenses.length} items
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search expenses"
          value={expenseSearch}
          onChange={(event) => setExpenseSearch(event.target.value)}
          className="w-full max-w-xs rounded-xl border border-ink/15 bg-white px-4 py-2 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
        />
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-sm dark:border-sand/30"
          onClick={() => {
            setExpenseFiltersOpen((current) => !current);
            setExpenseActiveFilter(null);
          }}
        >
          {icons.filter}
          Filters
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-sm dark:border-sand/30"
          onClick={() => setExpenseColumnsOpen((current) => !current)}
        >
          {icons.columns}
          Columns
        </button>
        <label className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-sm dark:border-sand/30">
          <input
            type="checkbox"
            checked={spreadsheetMode}
            onChange={(event) => setSpreadsheetMode(event.target.checked)}
          />
          Quick edit
        </label>
        <div className="relative">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-3 py-2 text-sm dark:border-sand/30"
            onClick={() => setExpenseMenuOpen((current) => !current)}
            aria-label="More options"
          >
            {icons.more}
          </button>
          {expenseMenuOpen ? (
            <div className="absolute right-0 z-20 mt-2 w-48 rounded-2xl border border-ink/10 bg-white p-2 text-sm shadow-xl dark:border-sand/10 dark:bg-[#141311]">
              <button
                type="button"
                className="w-full rounded-xl px-3 py-2 text-left hover:bg-ink/5 dark:hover:bg-sand/10"
                onClick={() => {
                  ResetExpenseTableState();
                  setExpenseMenuOpen(false);
                }}
              >
                Restore defaults
              </button>
            </div>
          ) : null}
        </div>
        <div className="ml-auto" />
        {!spreadsheetMode ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-sm dark:border-sand/30"
            onClick={StartAddExpense}
          >
            {icons.plus}
            Add expense
          </button>
        ) : null}
      </div>

      {spreadsheetMode ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink/10 bg-ink/5 px-3 py-2 text-xs text-ink/70 dark:border-sand/10 dark:bg-sand/10 dark:text-sand/70">
          <span>Quick edit mode is on. Click a row to edit.</span>
          <span>Enter saves. Esc cancels.</span>
        </div>
      ) : null}

      {expenseFiltersOpen ? (
        <div className="mt-3 grid gap-3 rounded-2xl border border-ink/10 bg-white/95 p-4 text-sm shadow-glow dark:border-sand/10 dark:bg-[#141311]/95">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60 dark:text-sand/60">
              Filters
            </div>
            <button
              type="button"
              className="text-xs text-ink/60 hover:text-ink dark:text-sand/60 dark:hover:text-sand"
              onClick={ClearExpenseFilters}
            >
              Clear all
            </button>
          </div>
          {[
            { key: "Frequency", label: "Frequency" },
            { key: "Account", label: "Account" },
            { key: "Type", label: "Type" },
            { key: "Cadence", label: "Cadence" },
            { key: "Enabled", label: "Status" }
          ]
            .filter((filter) => !expenseActiveFilter || filter.key === expenseActiveFilter)
            .map((filter) => (
              <details
                key={filter.key}
                className="rounded-xl border border-ink/10 px-3 py-2 dark:border-sand/10"
              >
                <summary className="cursor-pointer text-sm text-ink/70 dark:text-sand/70">
                  {filter.label}
                </summary>
                <div className="mt-2 space-y-2 text-xs">
                  {(expenseFilterOptions[filter.key] || []).length === 0 ? (
                    <div className="text-ink/40 dark:text-sand/40">No options</div>
                  ) : (
                    (expenseFilterOptions[filter.key] || []).map((option) => (
                      <label key={option} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={(expenseFilters[filter.key] || []).includes(option)}
                          onChange={() => ToggleExpenseFilterValue(filter.key, option)}
                        />
                        {option || "None"}
                      </label>
                    ))
                  )}
                </div>
              </details>
            ))}
        </div>
      ) : null}

      {expenseColumnsOpen ? (
        <div className="mt-3 rounded-2xl border border-ink/10 bg-white/95 p-4 text-sm shadow-glow dark:border-sand/10 dark:bg-[#141311]/95">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60 dark:text-sand/60">
            Columns
          </div>
          <div className="mt-3 grid gap-2">
            {expenseTableState.Columns.map((column) => (
              <label key={column.Key} className="flex items-center justify-between gap-3">
                <span>{column.Label || column.Key}</span>
                <button
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs ${
                    column.Visible === false
                      ? "border-ink/20 text-ink/50 dark:border-sand/20 dark:text-sand/50"
                      : "border-ink/50 text-ink dark:border-sand/40 dark:text-sand"
                  }`}
                  onClick={() => ToggleExpenseColumnVisibility(column.Key)}
                  disabled={column.Locked}
                >
                  {column.Visible === false ? "Show" : "Hide"}
                </button>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <ExpenseTable
        expenseTableState={expenseTableState}
        expenseColumnConfig={expenseColumnConfig}
        sortedExpenses={sortedExpenses}
        spreadsheetMode={spreadsheetMode}
        editingExpenseId={editingExpenseId}
        editExpenseForm={editExpenseForm}
        expenseForm={expenseForm}
        expenseAddLabelRef={expenseAddLabelRef}
        expenseAccounts={expenseAccounts}
        expenseTypes={expenseTypes}
        showExpenseOrder={showExpenseOrder}
        showExpenseLabel={showExpenseLabel}
        showExpenseAmount={showExpenseAmount}
        showExpenseFrequency={showExpenseFrequency}
        showExpensePerDay={showExpensePerDay}
        showExpensePerWeek={showExpensePerWeek}
        showExpensePerFortnight={showExpensePerFortnight}
        showExpensePerMonth={showExpensePerMonth}
        showExpensePerYear={showExpensePerYear}
        showExpenseAccount={showExpenseAccount}
        showExpenseType={showExpenseType}
        showExpenseNextDue={showExpenseNextDue}
        showExpenseCadence={showExpenseCadence}
        showExpenseInterval={showExpenseInterval}
        expenseTotals={expenseTotals}
        expenseTotalLabelKey={expenseTotalLabelKey}
        expenseFilters={expenseFilters}
        onActivateFilter={(key) => {
          setExpenseFiltersOpen(true);
          setExpenseActiveFilter(key);
        }}
        onSetSort={SetExpenseSort}
        onStartResize={StartExpenseColumnResize}
        onDragStart={StartExpenseDrag}
        onDragOver={HandleExpenseDragOver}
        onDragLeave={HandleExpenseDragLeave}
        onDrop={HandleExpenseDrop}
        draggingExpenseId={draggingExpenseId}
        dragOverExpenseId={dragOverExpenseId}
        onAddChange={(field, value) =>
          setExpenseForm((prev) => ({ ...prev, [field]: value }))
        }
        onAddKeyDown={HandleExpenseAddKeyDown}
        onEditChange={(field, value) =>
          setEditExpenseForm((prev) => ({ ...prev, [field]: value }))
        }
        onEditKeyDown={HandleExpenseEditKeyDown}
        onStartEdit={StartEditExpense}
        onSaveEdit={SaveExpenseEdit}
        onCancelEdit={CancelExpenseEdit}
        onDelete={DeleteExpenseItem}
        onToggleEnabled={ToggleExpenseEnabled}
        onRequestQuickEdit={() => setSpreadsheetMode(true)}
      />

      <ExpenseModal
        isOpen={expenseModalOpen}
        mode={expenseModalMode}
        form={expenseModalMode === "edit" ? editExpenseForm : expenseForm}
        accounts={expenseAccounts}
        types={expenseTypes}
        loading={loading}
        onClose={CloseExpenseModal}
        onDelete={() => DeleteExpenseItem(editingExpenseId)}
        onSubmit={(event) => {
          if (expenseModalMode === "edit") {
            event.preventDefault();
            SaveExpenseEdit(editingExpenseId);
            return;
          }
          HandleExpenseSubmit(event);
        }}
        onChange={(field, value) => {
          if (expenseModalMode === "edit") {
            setEditExpenseForm((prev) => ({ ...prev, [field]: value }));
            return;
          }
          setExpenseForm((prev) => ({ ...prev, [field]: value }));
        }}
        onToggleEnabled={(value) =>
          setEditExpenseForm((prev) => ({ ...prev, Enabled: value }))
        }
      />
    </div>
  );
}
