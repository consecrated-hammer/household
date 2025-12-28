import { FormatCurrency, FormatDate, FormatAmountInput, NormalizeAmountInput } from "../../lib/format.js";
import { icons } from "../icons.jsx";

export function ExpenseTable({
  expenseTableState,
  expenseColumnConfig,
  sortedExpenses,
  spreadsheetMode,
  editingExpenseId,
  editExpenseForm,
  expenseForm,
  expenseAddLabelRef,
  expenseAccounts,
  expenseTypes,
  showExpenseOrder,
  showExpenseLabel,
  showExpenseAmount,
  showExpenseFrequency,
  showExpensePerDay,
  showExpensePerWeek,
  showExpensePerFortnight,
  showExpensePerMonth,
  showExpensePerYear,
  showExpenseAccount,
  showExpenseType,
  showExpenseNextDue,
  showExpenseCadence,
  showExpenseInterval,
  expenseTotals,
  expenseTotalLabelKey,
  expenseFilters,
  onActivateFilter,
  onSetSort,
  onStartResize,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  draggingExpenseId,
  dragOverExpenseId,
  onAddChange,
  onAddKeyDown,
  onEditChange,
  onEditKeyDown,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onToggleEnabled,
  onRequestQuickEdit
}) {
  const labelColumnWidth = expenseColumnConfig.Label?.Width || 220;
  const maxLabelChars = Math.max(3, Math.floor((labelColumnWidth - 12) / 7));
  const NormalizeFrequency = (value) => String(value || "").toLowerCase();
  const MatchFrequency = (value) => {
    const normalized = NormalizeFrequency(value);
    if (normalized === "annually") {
      return "yearly";
    }
    return normalized;
  };
  const DisplayExpensePerValue = (expense, periodKey, perValue) => {
    const frequency = MatchFrequency(expense.Frequency);
    if (frequency === periodKey) {
      return FormatCurrency(expense.Amount);
    }
    return FormatCurrency(perValue);
  };

  return (
    <div className="mt-4 flex-1 overflow-x-auto overflow-y-visible rounded-2xl border border-ink/10 dark:border-sand/10">
      <div className="flex min-h-0 flex-col">
        <table className="w-max table-fixed text-left text-xs text-ink dark:text-sand">
          <colgroup>
            {showExpenseOrder ? (
              <col style={{ width: `${expenseColumnConfig.Order?.Width || 70}px` }} />
            ) : null}
            {showExpenseLabel ? (
              <col style={{ width: `${expenseColumnConfig.Label?.Width || 220}px` }} />
            ) : null}
            {showExpenseAmount ? (
              <col style={{ width: `${expenseColumnConfig.Amount?.Width || 130}px` }} />
            ) : null}
            {showExpenseFrequency ? (
              <col style={{ width: `${expenseColumnConfig.Frequency?.Width || 130}px` }} />
            ) : null}
            {showExpenseAccount ? (
              <col style={{ width: `${expenseColumnConfig.Account?.Width || 160}px` }} />
            ) : null}
            {showExpenseType ? (
              <col style={{ width: `${expenseColumnConfig.Type?.Width || 160}px` }} />
            ) : null}
            {showExpensePerDay ? (
              <col style={{ width: `${expenseColumnConfig.PerDay?.Width || 120}px` }} />
            ) : null}
            {showExpensePerWeek ? (
              <col style={{ width: `${expenseColumnConfig.PerWeek?.Width || 120}px` }} />
            ) : null}
            {showExpensePerFortnight ? (
              <col style={{ width: `${expenseColumnConfig.PerFortnight?.Width || 140}px` }} />
            ) : null}
            {showExpensePerMonth ? (
              <col style={{ width: `${expenseColumnConfig.PerMonth?.Width || 120}px` }} />
            ) : null}
            {showExpensePerYear ? (
              <col style={{ width: `${expenseColumnConfig.PerYear?.Width || 120}px` }} />
            ) : null}
            {showExpenseNextDue ? (
              <col style={{ width: `${expenseColumnConfig.NextDueDate?.Width || 140}px` }} />
            ) : null}
            {showExpenseCadence ? (
              <col style={{ width: `${expenseColumnConfig.Cadence?.Width || 120}px` }} />
            ) : null}
            {showExpenseInterval ? (
              <col style={{ width: `${expenseColumnConfig.Interval?.Width || 90}px` }} />
            ) : null}
            <col style={{ width: `${expenseColumnConfig.Actions?.Width || 110}px` }} />
          </colgroup>
          <thead className="bg-ink/5 text-ink/70 dark:bg-sand/10 dark:text-sand/70">
            <tr>
              {showExpenseOrder ? (
                <th className="relative px-0.5 py-0.5 text-center">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-left"
                    onClick={() => onSetSort("Order")}
                  >
                    <span>#</span>
                    {expenseTableState.Sort?.Key === "Order"
                      ? expenseTableState.Sort.Direction === "asc"
                        ? icons.sortUp
                        : icons.sortDown
                      : icons.sort}
                  </button>
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize"
                    onMouseDown={(event) => onStartResize("Order", event)}
                  />
                </th>
              ) : null}
              {showExpenseLabel ? (
                <th className="relative px-1 py-0.5">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-left"
                    onClick={() => onSetSort("Label")}
                  >
                    <span>Expense</span>
                    {expenseTableState.Sort?.Key === "Label"
                      ? expenseTableState.Sort.Direction === "asc"
                        ? icons.sortUp
                        : icons.sortDown
                      : icons.sort}
                  </button>
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize"
                    onMouseDown={(event) => onStartResize("Label", event)}
                  />
                </th>
              ) : null}
              {showExpenseAmount ? (
                <th className="relative px-1 py-0.5">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-left"
                    onClick={() => onSetSort("Amount")}
                  >
                    <span>Amount</span>
                    {expenseTableState.Sort?.Key === "Amount"
                      ? expenseTableState.Sort.Direction === "asc"
                        ? icons.sortUp
                        : icons.sortDown
                      : icons.sort}
                  </button>
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize"
                    onMouseDown={(event) => onStartResize("Amount", event)}
                  />
                </th>
              ) : null}
            {showExpenseFrequency ? (
              <th className="relative px-1 py-0.5">
                <div className="flex items-center gap-1">
                  <button
                      type="button"
                      className="flex items-center gap-1 text-left"
                      onClick={() => onSetSort("Frequency")}
                    >
                      <span>Frequency</span>
                      {expenseTableState.Sort?.Key === "Frequency"
                        ? expenseTableState.Sort.Direction === "asc"
                          ? icons.sortUp
                          : icons.sortDown
                        : icons.sort}
                    </button>
                    <button
                      type="button"
                      className={`text-ink/50 hover:text-ink dark:text-sand/60 dark:hover:text-sand ${
                        (expenseFilters.Frequency || []).length ? "text-ember" : ""
                      }`}
                      onClick={() => onActivateFilter("Frequency")}
                    >
                      {icons.filter}
                    </button>
                </div>
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize"
                  onMouseDown={(event) => onStartResize("Frequency", event)}
                />
              </th>
            ) : null}
            {showExpenseAccount ? (
              <th className="relative px-1 py-0.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-left"
                    onClick={() => onSetSort("Account")}
                  >
                    <span>Account</span>
                    {expenseTableState.Sort?.Key === "Account"
                      ? expenseTableState.Sort.Direction === "asc"
                        ? icons.sortUp
                        : icons.sortDown
                      : icons.sort}
                  </button>
                  <button
                    type="button"
                    className={`text-ink/50 hover:text-ink dark:text-sand/60 dark:hover:text-sand ${
                      (expenseFilters.Account || []).length ? "text-ember" : ""
                    }`}
                    onClick={() => onActivateFilter("Account")}
                  >
                    {icons.filter}
                  </button>
                </div>
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize"
                  onMouseDown={(event) => onStartResize("Account", event)}
                />
              </th>
            ) : null}
            {showExpenseType ? (
              <th className="relative px-1 py-0.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-left"
                    onClick={() => onSetSort("Type")}
                  >
                    <span>Type</span>
                    {expenseTableState.Sort?.Key === "Type"
                      ? expenseTableState.Sort.Direction === "asc"
                        ? icons.sortUp
                        : icons.sortDown
                      : icons.sort}
                  </button>
                  <button
                    type="button"
                    className={`text-ink/50 hover:text-ink dark:text-sand/60 dark:hover:text-sand ${
                      (expenseFilters.Type || []).length ? "text-ember" : ""
                    }`}
                    onClick={() => onActivateFilter("Type")}
                  >
                    {icons.filter}
                  </button>
                </div>
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize"
                  onMouseDown={(event) => onStartResize("Type", event)}
                />
              </th>
            ) : null}
            {showExpensePerDay ? (
              <th className="relative px-1 py-0.5">
                <button
                    type="button"
                    className="flex items-center gap-1 text-left"
                    onClick={() => onSetSort("PerDay")}
                  >
                    <span>Per day</span>
                    {expenseTableState.Sort?.Key === "PerDay"
                      ? expenseTableState.Sort.Direction === "asc"
                        ? icons.sortUp
                        : icons.sortDown
                      : icons.sort}
                  </button>
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize"
                    onMouseDown={(event) => onStartResize("PerDay", event)}
                  />
                </th>
              ) : null}
              {showExpensePerWeek ? (
                <th className="relative px-1 py-0.5">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-left"
                    onClick={() => onSetSort("PerWeek")}
                  >
                    <span>Per week</span>
                    {expenseTableState.Sort?.Key === "PerWeek"
                      ? expenseTableState.Sort.Direction === "asc"
                        ? icons.sortUp
                        : icons.sortDown
                      : icons.sort}
                  </button>
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize"
                    onMouseDown={(event) => onStartResize("PerWeek", event)}
                  />
                </th>
              ) : null}
              {showExpensePerFortnight ? (
                <th className="relative px-1 py-0.5">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-left"
                    onClick={() => onSetSort("PerFortnight")}
                  >
                    <span>Per fortnight</span>
                    {expenseTableState.Sort?.Key === "PerFortnight"
                      ? expenseTableState.Sort.Direction === "asc"
                        ? icons.sortUp
                        : icons.sortDown
                      : icons.sort}
                  </button>
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize"
                    onMouseDown={(event) => onStartResize("PerFortnight", event)}
                  />
                </th>
              ) : null}
              {showExpensePerMonth ? (
                <th className="relative px-1 py-0.5">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-left"
                    onClick={() => onSetSort("PerMonth")}
                  >
                    <span>Per month</span>
                    {expenseTableState.Sort?.Key === "PerMonth"
                      ? expenseTableState.Sort.Direction === "asc"
                        ? icons.sortUp
                        : icons.sortDown
                      : icons.sort}
                  </button>
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize"
                    onMouseDown={(event) => onStartResize("PerMonth", event)}
                  />
                </th>
              ) : null}
              {showExpensePerYear ? (
                <th className="relative px-1 py-0.5">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-left"
                    onClick={() => onSetSort("PerYear")}
                  >
                    <span>Per year</span>
                    {expenseTableState.Sort?.Key === "PerYear"
                      ? expenseTableState.Sort.Direction === "asc"
                        ? icons.sortUp
                        : icons.sortDown
                      : icons.sort}
                  </button>
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize"
                    onMouseDown={(event) => onStartResize("PerYear", event)}
                  />
                </th>
              ) : null}
              {showExpenseNextDue ? (
                <th className="relative px-1 py-0.5">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-left"
                    onClick={() => onSetSort("NextDueDate")}
                  >
                    <span>Next due</span>
                    {expenseTableState.Sort?.Key === "NextDueDate"
                      ? expenseTableState.Sort.Direction === "asc"
                        ? icons.sortUp
                        : icons.sortDown
                      : icons.sort}
                  </button>
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize"
                    onMouseDown={(event) => onStartResize("NextDueDate", event)}
                  />
                </th>
              ) : null}
              {showExpenseCadence ? (
                <th className="relative px-1 py-0.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="flex items-center gap-1 text-left"
                      onClick={() => onSetSort("Cadence")}
                    >
                      <span>Cadence</span>
                      {expenseTableState.Sort?.Key === "Cadence"
                        ? expenseTableState.Sort.Direction === "asc"
                          ? icons.sortUp
                          : icons.sortDown
                        : icons.sort}
                    </button>
                    <button
                      type="button"
                      className={`text-ink/50 hover:text-ink dark:text-sand/60 dark:hover:text-sand ${
                        (expenseFilters.Cadence || []).length ? "text-ember" : ""
                      }`}
                      onClick={() => onActivateFilter("Cadence")}
                    >
                      {icons.filter}
                    </button>
                  </div>
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize"
                    onMouseDown={(event) => onStartResize("Cadence", event)}
                  />
                </th>
              ) : null}
              {showExpenseInterval ? (
                <th className="relative px-1 py-0.5">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-left"
                    onClick={() => onSetSort("Interval")}
                  >
                    <span>Every</span>
                    {expenseTableState.Sort?.Key === "Interval"
                      ? expenseTableState.Sort.Direction === "asc"
                        ? icons.sortUp
                        : icons.sortDown
                      : icons.sort}
                  </button>
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize"
                    onMouseDown={(event) => onStartResize("Interval", event)}
                  />
                </th>
              ) : null}
              <th className="px-1 py-0.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10 dark:divide-sand/10">
            {spreadsheetMode ? (
              <tr className="bg-sand/50 text-ink/70 dark:bg-sand/10">
                {showExpenseOrder ? <td className="px-0.5 py-1 text-center" /> : null}
                {showExpenseLabel ? (
                  <td className="px-1 py-1">
                    <input
                      ref={expenseAddLabelRef}
                      type="text"
                      value={expenseForm.Label}
                      onChange={(event) => onAddChange("Label", event.target.value)}
                      onKeyDown={onAddKeyDown}
                      className="w-full rounded-md border border-ink/15 bg-white px-2 py-1 text-xs text-ink dark:border-sand/20 dark:bg-[#0f0e0c] dark:text-sand"
                    />
                  </td>
                ) : null}
                {showExpenseAmount ? (
                  <td className="px-1 py-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={FormatAmountInput(expenseForm.Amount)}
                      onChange={(event) =>
                        onAddChange("Amount", NormalizeAmountInput(event.target.value))
                      }
                      onKeyDown={onAddKeyDown}
                      className="w-full rounded-md border border-ink/15 bg-white px-2 py-1 text-xs text-ink dark:border-sand/20 dark:bg-[#0f0e0c] dark:text-sand"
                    />
                  </td>
                ) : null}
                {showExpenseFrequency ? (
                  <td className="px-1 py-1">
                    <select
                      value={expenseForm.Frequency}
                      onChange={(event) => onAddChange("Frequency", event.target.value)}
                      onKeyDown={onAddKeyDown}
                      className="w-full rounded-md border border-ink/15 bg-white px-2 py-1 text-xs text-ink dark:border-sand/20 dark:bg-[#0f0e0c] dark:text-sand"
                    >
                      <option>Weekly</option>
                      <option>Fortnightly</option>
                      <option>Monthly</option>
                      <option>Quarterly</option>
                      <option>Yearly</option>
                    </select>
                  </td>
                ) : null}
                {showExpenseAccount ? (
                  <td className="px-1 py-1">
                    <select
                      value={expenseForm.Account}
                      onChange={(event) => onAddChange("Account", event.target.value)}
                      onKeyDown={onAddKeyDown}
                      className="w-full rounded-md border border-ink/15 bg-white px-2 py-1 text-xs text-ink dark:border-sand/20 dark:bg-[#0f0e0c] dark:text-sand"
                    >
                      <option value="">Select</option>
                      {expenseAccounts.map((account) => (
                        <option key={account.Id} value={account.Name}>
                          {account.Enabled ? account.Name : `${account.Name} (disabled)`}
                        </option>
                      ))}
                    </select>
                  </td>
                ) : null}
                {showExpenseType ? (
                  <td className="px-1 py-1">
                    <select
                      value={expenseForm.Type}
                      onChange={(event) => onAddChange("Type", event.target.value)}
                      onKeyDown={onAddKeyDown}
                      className="w-full rounded-md border border-ink/15 bg-white px-2 py-1 text-xs text-ink dark:border-sand/20 dark:bg-[#0f0e0c] dark:text-sand"
                    >
                      <option value="">Select</option>
                      {expenseTypes.map((entry) => (
                        <option key={entry.Id} value={entry.Name}>
                          {entry.Enabled ? entry.Name : `${entry.Name} (disabled)`}
                        </option>
                      ))}
                    </select>
                  </td>
                ) : null}
                {showExpensePerDay ? <td className="px-1 py-1">-</td> : null}
                {showExpensePerWeek ? <td className="px-1 py-1">-</td> : null}
                {showExpensePerFortnight ? <td className="px-1 py-1">-</td> : null}
                {showExpensePerMonth ? <td className="px-1 py-1">-</td> : null}
                {showExpensePerYear ? <td className="px-1 py-1">-</td> : null}
                {showExpenseNextDue ? (
                  <td className="px-1 py-1">
                    <input
                      type="date"
                      value={expenseForm.NextDueDate}
                      onChange={(event) => onAddChange("NextDueDate", event.target.value)}
                      onKeyDown={onAddKeyDown}
                      className="w-full rounded-md border border-ink/15 bg-white px-2 py-1 text-xs text-ink dark:border-sand/20 dark:bg-[#0f0e0c] dark:text-sand"
                    />
                  </td>
                ) : null}
                {showExpenseCadence ? (
                  <td className="px-1 py-1">
                    <select
                      value={expenseForm.Cadence}
                      onChange={(event) => onAddChange("Cadence", event.target.value)}
                      onKeyDown={onAddKeyDown}
                      className="w-full rounded-md border border-ink/15 bg-white px-2 py-1 text-xs dark:border-sand/20 dark:bg-[#0f0e0c]"
                    >
                      <option value="">Select</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                      <option value="EveryNYears">Every N years</option>
                      <option value="OneOff">One-off</option>
                    </select>
                  </td>
                ) : null}
                {showExpenseInterval ? (
                  <td className="px-1 py-1">
                    <input
                      type="number"
                      min="1"
                      value={expenseForm.Interval}
                      onChange={(event) => onAddChange("Interval", event.target.value)}
                      onKeyDown={onAddKeyDown}
                      className="w-full rounded-md border border-ink/15 bg-white px-2 py-1 text-xs dark:border-sand/20 dark:bg-[#0f0e0c]"
                    />
                  </td>
                ) : null}
                <td className="px-1 py-1" />
              </tr>
            ) : null}
            {sortedExpenses.map((expense) => {
              const isEditing = editingExpenseId === expense.Id && spreadsheetMode;
              const displayLabel =
                expense.Label?.length > maxLabelChars
                  ? `${expense.Label.slice(0, maxLabelChars)}…`
                  : expense.Label;
              const showDetails = [expense.Account, expense.Type, expense.Notes].some(Boolean);
              return (
                <tr
                  key={expense.Id}
                  draggable
                  onDragStart={(event) => onDragStart(expense.Id, event)}
                  onDragOver={(event) => onDragOver(expense.Id, event)}
                  onDragLeave={onDragLeave}
                  onDrop={(event) => onDrop(expense.Id, event)}
                  onClick={() => {
                    if (spreadsheetMode && !isEditing) {
                      onStartEdit(expense, false);
                    }
                  }}
                  onDoubleClick={() => {
                    if (!spreadsheetMode && onRequestQuickEdit) {
                      onRequestQuickEdit();
                    }
                    onStartEdit(expense, false);
                  }}
                  className={`hover:bg-ink/5 dark:hover:bg-sand/10 ${
                    draggingExpenseId === expense.Id ? "opacity-50" : ""
                  } ${dragOverExpenseId === expense.Id ? "bg-ember/5" : ""}`}
                >
                  {showExpenseOrder ? (
                    <td className="px-0.5 py-0.5 text-center text-ink/60 dark:text-sand/60">
                      {expense.DisplayOrder ?? 0}
                    </td>
                  ) : null}
                  {showExpenseLabel ? (
                    <td className="px-1 py-0.5">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editExpenseForm.Label}
                          onChange={(event) => onEditChange("Label", event.target.value)}
                          onKeyDown={(event) => onEditKeyDown(event, expense.Id)}
                          className="w-full rounded-md border border-ink/15 bg-white px-2 py-1 text-xs text-ink dark:border-sand/20 dark:bg-[#0f0e0c] dark:text-sand"
                        />
                      ) : (
                        <span title={expense.Label}>{displayLabel}</span>
                      )}
                    </td>
                  ) : null}
                  {showExpenseAmount ? (
                    <td className="px-1 py-0.5">
                      {isEditing ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={FormatAmountInput(editExpenseForm.Amount)}
                          onChange={(event) =>
                            onEditChange("Amount", NormalizeAmountInput(event.target.value))
                          }
                          onKeyDown={(event) => onEditKeyDown(event, expense.Id)}
                          className="w-full rounded-md border border-ink/15 bg-white px-2 py-1 text-xs text-ink dark:border-sand/20 dark:bg-[#0f0e0c] dark:text-sand"
                        />
                      ) : (
                        FormatCurrency(expense.Amount)
                      )}
                    </td>
                  ) : null}
                  {showExpenseFrequency ? (
                    <td className="px-1 py-0.5">
                      {isEditing ? (
                        <select
                          value={editExpenseForm.Frequency}
                          onChange={(event) => onEditChange("Frequency", event.target.value)}
                          onKeyDown={(event) => onEditKeyDown(event, expense.Id)}
                          className="w-full rounded-md border border-ink/15 bg-white px-2 py-1 text-xs text-ink dark:border-sand/20 dark:bg-[#0f0e0c] dark:text-sand"
                        >
                          <option>Weekly</option>
                          <option>Fortnightly</option>
                          <option>Monthly</option>
                          <option>Quarterly</option>
                          <option>Yearly</option>
                        </select>
                      ) : (
                        expense.Frequency
                      )}
                    </td>
                  ) : null}
                  {showExpenseAccount ? (
                    <td className="px-1 py-0.5">
                      {isEditing ? (
                        <select
                          value={editExpenseForm.Account}
                          onChange={(event) => onEditChange("Account", event.target.value)}
                          onKeyDown={(event) => onEditKeyDown(event, expense.Id)}
                          className="w-full rounded-md border border-ink/15 bg-white px-2 py-1 text-xs text-ink dark:border-sand/20 dark:bg-[#0f0e0c] dark:text-sand"
                        >
                          <option value="">Select</option>
                          {expenseAccounts.map((account) => (
                            <option key={account.Id} value={account.Name}>
                              {account.Enabled ? account.Name : `${account.Name} (disabled)`}
                            </option>
                          ))}
                        </select>
                      ) : (
                        expense.Account || "-"
                      )}
                    </td>
                  ) : null}
                  {showExpenseType ? (
                    <td className="px-1 py-0.5">
                      {isEditing ? (
                        <select
                          value={editExpenseForm.Type}
                          onChange={(event) => onEditChange("Type", event.target.value)}
                          onKeyDown={(event) => onEditKeyDown(event, expense.Id)}
                          className="w-full rounded-md border border-ink/15 bg-white px-2 py-1 text-xs text-ink dark:border-sand/20 dark:bg-[#0f0e0c] dark:text-sand"
                        >
                          <option value="">Select</option>
                          {expenseTypes.map((entry) => (
                            <option key={entry.Id} value={entry.Name}>
                              {entry.Enabled ? entry.Name : `${entry.Name} (disabled)`}
                            </option>
                          ))}
                        </select>
                      ) : (
                        expense.Type || "-"
                      )}
                    </td>
                  ) : null}
                  {showExpensePerDay ? (
                    <td className="px-1 py-0.5">
                      {DisplayExpensePerValue(expense, "daily", expense.PerDay)}
                    </td>
                  ) : null}
                  {showExpensePerWeek ? (
                    <td className="px-1 py-0.5">
                      {DisplayExpensePerValue(expense, "weekly", expense.PerWeek)}
                    </td>
                  ) : null}
                  {showExpensePerFortnight ? (
                    <td className="px-1 py-0.5">
                      {DisplayExpensePerValue(expense, "fortnightly", expense.PerFortnight)}
                    </td>
                  ) : null}
                  {showExpensePerMonth ? (
                    <td className="px-1 py-0.5">
                      {DisplayExpensePerValue(expense, "monthly", expense.PerMonth)}
                    </td>
                  ) : null}
                  {showExpensePerYear ? (
                    <td className="px-1 py-0.5">
                      {DisplayExpensePerValue(expense, "yearly", expense.PerYear)}
                    </td>
                  ) : null}
                  {showExpenseNextDue ? (
                    <td className="px-1 py-0.5">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editExpenseForm.NextDueDate}
                          onChange={(event) => onEditChange("NextDueDate", event.target.value)}
                          onKeyDown={(event) => onEditKeyDown(event, expense.Id)}
                          className="w-full rounded-md border border-ink/15 bg-white px-2 py-1 text-xs text-ink dark:border-sand/20 dark:bg-[#0f0e0c] dark:text-sand"
                        />
                      ) : (
                        FormatDate(expense.NextDueDate)
                      )}
                    </td>
                  ) : null}
                  {showExpenseCadence ? (
                    <td className="px-1 py-0.5">
                      {isEditing ? (
                        <select
                          value={editExpenseForm.Cadence}
                          onChange={(event) => onEditChange("Cadence", event.target.value)}
                          onKeyDown={(event) => onEditKeyDown(event, expense.Id)}
                          className="w-full rounded-md border border-ink/15 bg-white px-2 py-1 text-xs text-ink dark:border-sand/20 dark:bg-[#0f0e0c] dark:text-sand"
                        >
                          <option value="">Select</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="Yearly">Yearly</option>
                          <option value="EveryNYears">Every N years</option>
                          <option value="OneOff">One-off</option>
                        </select>
                      ) : (
                        expense.Cadence || "-"
                      )}
                    </td>
                  ) : null}
                  {showExpenseInterval ? (
                    <td className="px-1 py-0.5">
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          value={editExpenseForm.Interval}
                          onChange={(event) => onEditChange("Interval", event.target.value)}
                          onKeyDown={(event) => onEditKeyDown(event, expense.Id)}
                          className="w-full rounded-md border border-ink/15 bg-white px-2 py-1 text-xs dark:border-sand/20 dark:bg-[#0f0e0c]"
                        />
                      ) : (
                        expense.Interval || "-"
                      )}
                    </td>
                  ) : null}
                  <td className="px-1 py-0.5">
                    <div className="flex items-center justify-end gap-2 text-[11px] text-ink/70 dark:text-sand/70">
                      {showDetails ? (
                        <div className="group relative">
                          <button
                            type="button"
                            className="p-1 text-[11px] text-ink/70 hover:text-ink dark:text-sand/70 dark:hover:text-sand"
                            aria-label="View expense details"
                          >
                            {icons.info}
                          </button>
                          <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-72 rounded-2xl border border-ink/10 bg-white p-3 text-xs opacity-0 shadow-xl backdrop-blur transition group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 dark:border-sand/10 dark:bg-[#12110f]">
                            <div className="space-y-1 text-[11px] text-ink/60 dark:text-sand/60">
                              <div>
                                <span className="font-semibold text-ink/80 dark:text-sand/80">Account:</span>{" "}
                                {expense.Account || "None"}
                              </div>
                              <div>
                                <span className="font-semibold text-ink/80 dark:text-sand/80">Type:</span>{" "}
                                {expense.Type || "None"}
                              </div>
                              <div>
                                <span className="font-semibold text-ink/80 dark:text-sand/80">Notes:</span>{" "}
                                {expense.Notes || "None"}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                      {spreadsheetMode && isEditing ? (
                        <>
                          <button
                            type="button"
                            className="p-1 text-[11px] text-ink/70 hover:text-ink dark:text-sand/70 dark:hover:text-sand"
                            onClick={() => onSaveEdit(expense.Id)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="p-1 text-[11px] text-ink/70 hover:text-ink dark:text-sand/70 dark:hover:text-sand"
                            onClick={onCancelEdit}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="p-1 text-[11px] text-ember hover:text-ember/80"
                            onClick={() => onDelete(expense.Id)}
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="p-1 text-[11px] text-ink/70 hover:text-ink dark:text-sand/70 dark:hover:text-sand"
                          onClick={() => onStartEdit(expense, !spreadsheetMode)}
                          aria-label="Edit expense"
                        >
                          {icons.edit}
                        </button>
                      )}
                      {!spreadsheetMode ? (
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={expense.Enabled}
                            onChange={() => onToggleEnabled(expense)}
                          />
                          <span className="text-[10px]">Enabled</span>
                        </label>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            <tr className="bg-ink/5 font-semibold dark:bg-sand/10">
              {showExpenseOrder ? (
                <td className="px-0.5 py-0.5 text-center">
                  {expenseTotalLabelKey === "Order" ? "Total" : ""}
                </td>
              ) : null}
              {showExpenseLabel ? (
                <td className="px-1 py-0.5">{expenseTotalLabelKey === "Label" ? "Total" : ""}</td>
              ) : null}
              {showExpenseAmount ? (
                <td className="px-1 py-0.5">{expenseTotalLabelKey === "Amount" ? "Total" : ""}</td>
              ) : null}
              {showExpenseFrequency ? (
                <td className="px-1 py-0.5">{expenseTotalLabelKey === "Frequency" ? "Total" : ""}</td>
              ) : null}
              {showExpenseAccount ? (
                <td className="px-1 py-0.5">{expenseTotalLabelKey === "Account" ? "Total" : ""}</td>
              ) : null}
              {showExpenseType ? (
                <td className="px-1 py-0.5">{expenseTotalLabelKey === "Type" ? "Total" : ""}</td>
              ) : null}
              {showExpensePerDay ? (
                <td className="px-1 py-0.5">{FormatCurrency(expenseTotals.PerDay)}</td>
              ) : null}
              {showExpensePerWeek ? (
                <td className="px-1 py-0.5">{FormatCurrency(expenseTotals.PerWeek)}</td>
              ) : null}
              {showExpensePerFortnight ? (
                <td className="px-1 py-0.5">{FormatCurrency(expenseTotals.PerFortnight)}</td>
              ) : null}
              {showExpensePerMonth ? (
                <td className="px-1 py-0.5">{FormatCurrency(expenseTotals.PerMonth)}</td>
              ) : null}
              {showExpensePerYear ? (
                <td className="px-1 py-0.5">{FormatCurrency(expenseTotals.PerYear)}</td>
              ) : null}
              {showExpenseNextDue ? <td className="px-1 py-0.5" /> : null}
              {showExpenseCadence ? <td className="px-1 py-0.5" /> : null}
              {showExpenseInterval ? <td className="px-1 py-0.5" /> : null}
              <td className="px-1 py-0.5" />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
