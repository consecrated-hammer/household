import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CreateScenario,
  DeleteScenario,
  EstimateTax,
  ListScenarios,
  ListTaxYears
} from "../../lib/api.js";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useSettings } from "../../contexts/SettingsContext.jsx";
import { useIncomeStreams } from "../../hooks/useIncomeStreams.js";
import {
  DisplayForPeriod,
  FormatAmountInput,
  FormatCurrency,
  FormatDate,
  NormalizeAmountInput,
  ToNumber
} from "../../lib/format.js";
import {
  AnnualizedScenarioBreakdown,
  GetCalculatorPeriodAmount,
  GetDaysInFinancialYear,
  GetPeriodValue
} from "../../lib/finance.js";

const InitialIncomeForm = {
  Label: "",
  NetAmount: "",
  GrossAmount: "",
  FirstPayDate: "",
  Frequency: "Monthly",
  EndDate: "",
  Notes: ""
};

export function IncomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { ExecuteWithRefresh } = useAuth();
  const { defaultSuperRate } = useSettings();
  const {
    incomeStreams,
    loading,
    error,
    createIncomeStream,
    updateIncomeStream
  } = useIncomeStreams();
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [incomeForm, setIncomeForm] = useState(InitialIncomeForm);
  const [editingStreamId, setEditingStreamId] = useState(null);
  const [showAddIncomeForm, setShowAddIncomeForm] = useState(false);
  const [scenarioEnabled, setScenarioEnabled] = useState(false);
  const [scenarioType, setScenarioType] = useState("net");
  const [scenarioSelectedIds, setScenarioSelectedIds] = useState([]);
  const [scenarioAdjustments, setScenarioAdjustments] = useState({});
  const [scenarioName, setScenarioName] = useState("");
  const [savedScenarios, setSavedScenarios] = useState([]);
  const [scenarioSearch, setScenarioSearch] = useState("");
  const [scenarioDropdownOpen, setScenarioDropdownOpen] = useState(false);
  const [taxYears, setTaxYears] = useState([]);
  const [calculatorResult, setCalculatorResult] = useState(null);
  const [, setCalculatorLoading] = useState(false);
  const [calculatorApplyOpen, setCalculatorApplyOpen] = useState(false);
  const [calculatorApplyMode, setCalculatorApplyMode] = useState("create");
  const [calculatorTargetStream, setCalculatorTargetStream] = useState("");
  const [calculatorEffectiveDate, setCalculatorEffectiveDate] = useState("");
  const [calculatorScenarioType, setCalculatorScenarioType] = useState("net");
  const [activeView, setActiveView] = useState("summary");
  const [calculatorForm, setCalculatorForm] = useState({
    SalaryAmount: "",
    SalaryFrequency: "Yearly",
    IncludesSuper: false,
    SuperRate: defaultSuperRate,
    PrivateHealth: true,
    NovatedLeaseAmount: "",
    NovatedLeaseFrequency: "Yearly",
    HoursPerWeek: "38",
    DaysPerWeek: "5",
    TaxYear: "",
    IncomeFrequency: "Fortnightly"
  });
  const calculatorDebounceRef = useRef(null);

  useEffect(() => {
    setCalculatorForm((prev) => ({
      ...prev,
      SuperRate: defaultSuperRate
    }));
  }, [defaultSuperRate]);

  useEffect(() => {
    if (incomeStreams.length === 0) {
      setShowAddIncomeForm(true);
      return;
    }
    if (!editingStreamId) {
      setShowAddIncomeForm(false);
    }
  }, [incomeStreams.length, editingStreamId]);

  useEffect(() => {
    if (error) {
      setStatus({ type: "error", message: error.message });
    }
  }, [error]);

  useEffect(() => {
    ExecuteWithRefresh((accessToken) => ListScenarios(accessToken))
      .then(setSavedScenarios)
      .catch((err) => {
        setStatus({ type: "error", message: err.message });
      });
  }, [ExecuteWithRefresh]);

  useEffect(() => {
    ExecuteWithRefresh((accessToken) => ListTaxYears(accessToken))
      .then((years) => {
        setTaxYears(years);
        if (!calculatorForm.TaxYear && years.length) {
          const today = new Date();
          const current =
            years.find((year) => {
              const start = new Date(year.StartDate);
              const end = new Date(year.EndDate);
              return start <= today && today <= end;
            }) || years[years.length - 1];
          if (current) {
            setCalculatorForm((currentForm) => ({
              ...currentForm,
              TaxYear: current.Label
            }));
          }
        }
      })
      .catch((err) => setStatus({ type: "error", message: err.message }));
  }, [ExecuteWithRefresh, calculatorForm.TaxYear]);

  const CalculateTaxEstimate = useCallback(async () => {
    setCalculatorLoading(true);
    setStatus({ type: "idle", message: "" });
    try {
      const payload = {
        SalaryAmount: ToNumber(calculatorForm.SalaryAmount),
        SalaryFrequency: calculatorForm.SalaryFrequency,
        IncludesSuper: calculatorForm.IncludesSuper,
        SuperRate: ToNumber(calculatorForm.SuperRate),
        PrivateHealth: calculatorForm.PrivateHealth,
        NovatedLeaseAmount: ToNumber(calculatorForm.NovatedLeaseAmount),
        NovatedLeaseFrequency: calculatorForm.NovatedLeaseFrequency,
        HoursPerWeek:
          calculatorForm.SalaryFrequency === "Hourly"
            ? calculatorForm.HoursPerWeek
              ? ToNumber(calculatorForm.HoursPerWeek)
              : null
            : null,
        DaysPerWeek:
          calculatorForm.SalaryFrequency === "Daily"
            ? calculatorForm.DaysPerWeek
              ? ToNumber(calculatorForm.DaysPerWeek)
              : null
            : null,
        TaxYear: calculatorForm.TaxYear || null
      };
      const result = await ExecuteWithRefresh((accessToken) =>
        EstimateTax(accessToken, payload)
      );
      setCalculatorResult(result);
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setCalculatorLoading(false);
    }
  }, [ExecuteWithRefresh, calculatorForm, setCalculatorLoading]);

  useEffect(() => {
    if (!calculatorForm.SalaryAmount || !calculatorForm.TaxYear) {
      setCalculatorResult(null);
      return;
    }
    if (calculatorDebounceRef.current) {
      clearTimeout(calculatorDebounceRef.current);
    }
    calculatorDebounceRef.current = setTimeout(() => {
      CalculateTaxEstimate();
    }, 400);
    return () => {
      if (calculatorDebounceRef.current) {
        clearTimeout(calculatorDebounceRef.current);
      }
    };
  }, [
    calculatorForm.SalaryAmount,
    calculatorForm.SalaryFrequency,
    calculatorForm.IncludesSuper,
    calculatorForm.SuperRate,
    calculatorForm.PrivateHealth,
    calculatorForm.NovatedLeaseAmount,
    calculatorForm.NovatedLeaseFrequency,
    calculatorForm.HoursPerWeek,
    calculatorForm.DaysPerWeek,
    calculatorForm.TaxYear,
    CalculateTaxEstimate
  ]);

  useEffect(() => {
    if (!location.hash) {
      setActiveView("summary");
      return;
    }
    const hash = location.hash.replace("#", "");
    if (hash === "add-income") {
      setActiveView("summary");
      StartAddIncome();
      return;
    }
    if (hash === "calculator") {
      setActiveView("calculator");
      requestAnimationFrame(() => {
        document.getElementById("salary-calculator")?.scrollIntoView({ behavior: "smooth" });
      });
      return;
    }
    if (hash === "what-if") {
      setActiveView("whatif");
      setScenarioEnabled(true);
      requestAnimationFrame(() => {
        document.getElementById("what-if")?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [location.hash]);

  const totals = useMemo(() => {
    return incomeStreams.reduce(
      (acc, stream) => {
        acc.NetAmount += ToNumber(stream.NetAmount);
        acc.GrossAmount += ToNumber(stream.GrossAmount);
        acc.NetPerDay += ToNumber(stream.NetPerDay);
        acc.NetPerWeek += ToNumber(stream.NetPerWeek);
        acc.NetPerFortnight += ToNumber(stream.NetPerFortnight);
        acc.NetPerMonth += ToNumber(stream.NetPerMonth);
        acc.NetPerYear += ToNumber(stream.NetPerYear);
        acc.GrossPerDay += ToNumber(stream.GrossPerDay);
        acc.GrossPerWeek += ToNumber(stream.GrossPerWeek);
        acc.GrossPerFortnight += ToNumber(stream.GrossPerFortnight);
        acc.GrossPerMonth += ToNumber(stream.GrossPerMonth);
        acc.GrossPerYear += ToNumber(stream.GrossPerYear);
        return acc;
      },
      {
        NetAmount: 0,
        GrossAmount: 0,
        NetPerDay: 0,
        NetPerWeek: 0,
        NetPerFortnight: 0,
        NetPerMonth: 0,
        NetPerYear: 0,
        GrossPerDay: 0,
        GrossPerWeek: 0,
        GrossPerFortnight: 0,
        GrossPerMonth: 0,
        GrossPerYear: 0
      }
    );
  }, [incomeStreams]);

  const scenarioTotals = useMemo(() => {
    const selectedSet = new Set(scenarioSelectedIds);
    const isNet = scenarioType === "net";
    const selectedStreams = incomeStreams.filter((stream) => selectedSet.has(stream.Id));
    const selectedTotals = selectedStreams.reduce(
      (acc, stream) => {
        acc.PerDay += ToNumber(isNet ? stream.NetPerDay : stream.GrossPerDay);
        acc.PerWeek += ToNumber(isNet ? stream.NetPerWeek : stream.GrossPerWeek);
        acc.PerFortnight += ToNumber(isNet ? stream.NetPerFortnight : stream.GrossPerFortnight);
        acc.PerMonth += ToNumber(isNet ? stream.NetPerMonth : stream.GrossPerMonth);
        acc.PerYear += ToNumber(isNet ? stream.NetPerYear : stream.GrossPerYear);
        return acc;
      },
      { PerDay: 0, PerWeek: 0, PerFortnight: 0, PerMonth: 0, PerYear: 0 }
    );

    const daysInYear = GetDaysInFinancialYear();
    const scenarioBreakdown = selectedStreams.reduce(
      (acc, stream) => {
        const adjustment = scenarioAdjustments[stream.Id];
        if (!adjustment || ToNumber(adjustment.Amount) === 0) {
          return acc;
        }
        const rowFrequency = adjustment.Frequency || stream.Frequency;
        const deltaAmount =
          ToNumber(adjustment.Amount) - ToNumber(GetPeriodValue(stream, isNet, rowFrequency));
        if (deltaAmount === 0) {
          return acc;
        }
        const delta = AnnualizedScenarioBreakdown(deltaAmount, rowFrequency, daysInYear);
        acc.PerDay += delta.PerDay;
        acc.PerWeek += delta.PerWeek;
        acc.PerFortnight += delta.PerFortnight;
        acc.PerMonth += delta.PerMonth;
        acc.PerYear += delta.PerYear;
        return acc;
      },
      { PerDay: 0, PerWeek: 0, PerFortnight: 0, PerMonth: 0, PerYear: 0 }
    );

    return {
      SelectedTotals: selectedTotals,
      DeltaTotals: scenarioBreakdown,
      ScenarioTotals: {
        PerDay: selectedTotals.PerDay + scenarioBreakdown.PerDay,
        PerWeek: selectedTotals.PerWeek + scenarioBreakdown.PerWeek,
        PerFortnight: selectedTotals.PerFortnight + scenarioBreakdown.PerFortnight,
        PerMonth: selectedTotals.PerMonth + scenarioBreakdown.PerMonth,
        PerYear: selectedTotals.PerYear + scenarioBreakdown.PerYear
      }
    };
  }, [incomeStreams, scenarioAdjustments, scenarioSelectedIds, scenarioType]);

  const HandleIncomeSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "idle", message: "" });
    try {
      const payload = {
        ...incomeForm,
        NetAmount: Number(incomeForm.NetAmount),
        GrossAmount: Number(incomeForm.GrossAmount),
        EndDate: incomeForm.EndDate || null,
        Notes: incomeForm.Notes || null
      };
      if (editingStreamId) {
        await updateIncomeStream(editingStreamId, payload);
      } else {
        await createIncomeStream(payload);
      }
      setIncomeForm(InitialIncomeForm);
      setShowAddIncomeForm(false);
      setEditingStreamId(null);
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  };

  const StartAddIncome = () => {
    setEditingStreamId(null);
    setIncomeForm(InitialIncomeForm);
    setShowAddIncomeForm(true);
    requestAnimationFrame(() => {
      document.getElementById("income-form")?.scrollIntoView({ behavior: "smooth" });
    });
  };

  const StartEditIncome = (stream) => {
    setIncomeForm({
      Label: stream.Label,
      NetAmount: stream.NetAmount,
      GrossAmount: stream.GrossAmount,
      FirstPayDate: stream.FirstPayDate,
      Frequency: stream.Frequency,
      EndDate: stream.EndDate || "",
      Notes: stream.Notes || ""
    });
    setEditingStreamId(stream.Id);
    setShowAddIncomeForm(true);
    requestAnimationFrame(() => {
      document.getElementById("income-form")?.scrollIntoView({ behavior: "smooth" });
    });
  };

  const CancelIncomeEdit = () => {
    setEditingStreamId(null);
    setIncomeForm(InitialIncomeForm);
    setShowAddIncomeForm(false);
  };

  const HandleCalculatorSubmit = async (event) => {
    event.preventDefault();
    await CalculateTaxEstimate();
  };

  const ApplyCalculatorToIncome = () => {
    if (!calculatorResult) {
      setStatus({ type: "error", message: "Run the calculator first." });
      return;
    }
    const daysInYear = GetDaysInFinancialYear();
    const frequency = calculatorForm.IncomeFrequency;
    const netAmount = GetCalculatorPeriodAmount(calculatorResult, "Net", frequency, daysInYear);
    const grossAmount = GetCalculatorPeriodAmount(calculatorResult, "Gross", frequency, daysInYear);
    if (netAmount === null || grossAmount === null) {
      setStatus({ type: "error", message: "Unable to apply calculator amounts." });
      return;
    }
    const netValue = Number(netAmount).toFixed(2);
    const grossValue = Number(grossAmount).toFixed(2);
    const effectiveDate = calculatorEffectiveDate || "";

    if (calculatorApplyMode === "update") {
      const target = incomeStreams.find(
        (stream) => String(stream.Id) === String(calculatorTargetStream)
      );
      if (!target) {
        setStatus({ type: "error", message: "Select an income stream to update." });
        return;
      }
      setCalculatorApplyOpen(false);
      StartEditIncome(target);
      setIncomeForm((current) => ({
        ...current,
        NetAmount: netValue,
        GrossAmount: grossValue,
        Frequency: frequency,
        FirstPayDate: effectiveDate || current.FirstPayDate
      }));
      return;
    }

    setCalculatorApplyOpen(false);
    setEditingStreamId(null);
    setIncomeForm({
      ...InitialIncomeForm,
      Label: "Salary calculator",
      NetAmount: netValue,
      GrossAmount: grossValue,
      Frequency: frequency,
      FirstPayDate: effectiveDate
    });
    setShowAddIncomeForm(true);
  };

  const ApplyCalculatorToScenario = () => {
    if (!calculatorResult) {
      setStatus({ type: "error", message: "Run the calculator first." });
      return;
    }
    const target = incomeStreams.find(
      (stream) => String(stream.Id) === String(calculatorTargetStream)
    );
    if (!target) {
      setStatus({ type: "error", message: "Select an income stream to compare." });
      return;
    }
    const daysInYear = GetDaysInFinancialYear();
    const frequency = calculatorForm.IncomeFrequency;
    const field = calculatorScenarioType === "gross" ? "Gross" : "Net";
    const amount = GetCalculatorPeriodAmount(calculatorResult, field, frequency, daysInYear);
    if (amount === null) {
      setStatus({ type: "error", message: "Unable to apply calculator amounts." });
      return;
    }
    setScenarioType(calculatorScenarioType);
    setScenarioEnabled(true);
    setScenarioSelectedIds((current) => {
      if (current.includes(target.Id)) {
        return current;
      }
      return [...current, target.Id];
    });
    setScenarioAdjustments((current) => ({
      ...current,
      [target.Id]: {
        Amount: Number(amount).toFixed(2),
        Frequency: frequency
      }
    }));
    setCalculatorApplyOpen(false);
    requestAnimationFrame(() => {
      document.getElementById("what-if")?.scrollIntoView({ behavior: "smooth" });
    });
  };

  const SaveScenario = async () => {
    if (!scenarioName.trim()) {
      setStatus({ type: "error", message: "Scenario name is required." });
      return;
    }
    const adjustments = scenarioSelectedIds
      .map((streamId) => {
        const adjustment = scenarioAdjustments[streamId];
        if (!adjustment) {
          return null;
        }
        return {
          StreamId: streamId,
          Amount: ToNumber(adjustment.Amount),
          Frequency: adjustment.Frequency || "",
          Included: true
        };
      })
      .filter(Boolean);
    const payload = {
      Name: scenarioName.trim(),
      ScenarioType: scenarioType,
      Adjustments: adjustments
    };
    try {
      const created = await ExecuteWithRefresh((accessToken) =>
        CreateScenario(accessToken, payload)
      );
      setSavedScenarios((current) => [created, ...current]);
      setScenarioName("");
      setStatus({ type: "success", message: "Scenario saved." });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  };

  const LoadScenario = (scenario) => {
    setScenarioType(scenario.ScenarioType);
    const adjustments = scenario.Adjustments || [];
    setScenarioSelectedIds(adjustments.filter((adj) => adj.Included).map((adj) => adj.StreamId));
    setScenarioAdjustments(
      adjustments.reduce((acc, adj) => {
        acc[adj.StreamId] = {
          Amount: adj.Amount,
          Frequency: adj.Frequency
        };
        return acc;
      }, {})
    );
    setScenarioEnabled(true);
    setStatus({ type: "success", message: `Loaded scenario "${scenario.Name}".` });
  };

  const DeleteScenarioLocal = async (scenarioId) => {
    try {
      await ExecuteWithRefresh((accessToken) => DeleteScenario(accessToken, scenarioId));
      setSavedScenarios((current) => current.filter((item) => item.Id !== scenarioId));
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  };

  const filteredScenarios = useMemo(() => {
    const query = scenarioSearch.trim().toLowerCase();
    if (!query) {
      return savedScenarios;
    }
    return savedScenarios.filter((scenario) =>
      scenario.Name.toLowerCase().includes(query)
    );
  }, [savedScenarios, scenarioSearch]);

  return (
    <div className="flex flex-col gap-4 text-ink dark:text-sand">
      {status.message ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            status.type === "error" ? "bg-ember/10 text-ember" : "bg-moss/10 text-moss"
          }`}
        >
          {status.message}
        </div>
      ) : null}

      {scenarioEnabled && activeView === "whatif" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">
          <div>Scenario mode active for {scenarioType.toUpperCase()} streams.</div>
          <button
            type="button"
            className="rounded-full border border-ember/30 px-3 py-1 text-xs"
            onClick={() => setScenarioEnabled(false)}
          >
            Exit scenario
          </button>
        </div>
      ) : null}

      <div className="rounded-3xl border border-ink/10 bg-white/95 p-4 shadow-glow backdrop-blur dark:border-sand/10 dark:bg-[#141311]/95">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-ink/50 dark:text-sand/60">
              Income tools
            </p>
            <h2 className="font-display text-2xl">Income overview</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: "summary", label: "Income", hash: "" },
              { key: "calculator", label: "Salary calculator", hash: "calculator" },
              { key: "whatif", label: "What-if analysis", hash: "what-if" }
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                className={`rounded-full px-4 py-2 text-xs ${
                  activeView === item.key
                    ? "bg-ink text-sand dark:bg-sand dark:text-ink"
                    : "border border-ink/20 text-ink/60 dark:border-sand/20 dark:text-sand/60"
                }`}
                onClick={() => {
                  setActiveView(item.key);
                  if (item.key === "whatif") {
                    setScenarioEnabled(true);
                  }
                  navigate(item.hash ? `/income#${item.hash}` : "/income", { replace: true });
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeView === "summary" ? (
        <div className="rounded-3xl border border-ink/10 bg-white/95 p-4 shadow-glow backdrop-blur dark:border-sand/10 dark:bg-[#141311]/95">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-ink/50 dark:text-sand/60">
                Current income
              </p>
              <h2 className="font-display text-2xl">Household income streams</h2>
            </div>
            <span className="text-xs uppercase tracking-[0.3em] text-ink/50 dark:text-sand/60">
              {loading ? "Loading" : `${incomeStreams.length} streams`}
            </span>
          </div>
          {incomeStreams.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-ink/20 p-4 text-sm text-ink/60 dark:border-sand/20 dark:text-sand/60">
              No income streams yet. Add the first one below.
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              <div>
                <div className="mb-3 rounded-2xl border border-ink/10 bg-ink/5 px-4 py-3 text-xs text-ink/70 dark:border-sand/10 dark:bg-sand/10 dark:text-sand/70">
                  <div className="grid gap-3">
                    {incomeStreams.map((stream) => (
                      <div key={`${stream.Id}-meta`} className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-ink/80 dark:text-sand/80">
                            {stream.Label}
                          </div>
                          <div>
                            {stream.Frequency} • Last {FormatDate(stream.LastPayDate)} • Next{" "}
                            {FormatDate(stream.NextPayDate)}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="rounded-full border border-ink/20 px-3 py-1 text-[11px] dark:border-sand/30"
                          onClick={() => StartEditIncome(stream)}
                        >
                          Edit
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/60 dark:text-sand/60">
                  Income - Net
                </div>
                <div className="overflow-auto rounded-2xl border border-ink/10 dark:border-sand/10">
                  <table className="min-w-[900px] w-full table-fixed text-left text-xs">
                    <colgroup>
                      <col className="w-[22%]" />
                      <col className="w-[13%]" />
                      <col className="w-[13%]" />
                      <col className="w-[13%]" />
                      <col className="w-[13%]" />
                      <col className="w-[26%]" />
                    </colgroup>
                    <thead className="bg-ink/5 text-ink/70 dark:bg-sand/10 dark:text-sand/70">
                      <tr>
                        <th className="px-3 py-2">Income</th>
                        <th className="px-3 py-2">Per day</th>
                        <th className="px-3 py-2">Per week</th>
                        <th className="px-3 py-2">Per fortnight</th>
                        <th className="px-3 py-2">Per month</th>
                        <th className="px-3 py-2">Per year</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/10 dark:divide-sand/10">
                      {incomeStreams.map((stream) => (
                        <tr key={stream.Id} className="hover:bg-ink/5 dark:hover:bg-sand/10">
                          <td className="px-3 py-2 font-semibold">{stream.Label}</td>
                          <td className="px-3 py-2">
                            {DisplayForPeriod(stream, "daily", stream.NetAmount, stream.NetPerDay)}
                          </td>
                          <td className="px-3 py-2">
                            {DisplayForPeriod(stream, "weekly", stream.NetAmount, stream.NetPerWeek)}
                          </td>
                          <td className="px-3 py-2">
                            {DisplayForPeriod(
                              stream,
                              "fortnightly",
                              stream.NetAmount,
                              stream.NetPerFortnight
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {DisplayForPeriod(stream, "monthly", stream.NetAmount, stream.NetPerMonth)}
                          </td>
                          <td className="px-3 py-2">
                            {DisplayForPeriod(stream, "yearly", stream.NetAmount, stream.NetPerYear)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-ink/5 font-semibold dark:bg-sand/10">
                        <td className="px-3 py-2">Total</td>
                        <td className="px-3 py-2">{FormatCurrency(totals.NetPerDay)}</td>
                        <td className="px-3 py-2">{FormatCurrency(totals.NetPerWeek)}</td>
                        <td className="px-3 py-2">{FormatCurrency(totals.NetPerFortnight)}</td>
                        <td className="px-3 py-2">{FormatCurrency(totals.NetPerMonth)}</td>
                        <td className="px-3 py-2">{FormatCurrency(totals.NetPerYear)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/60 dark:text-sand/60">
                  Income - Gross
                </div>
                <div className="overflow-auto rounded-2xl border border-ink/10 dark:border-sand/10">
                  <table className="min-w-[900px] w-full table-fixed text-left text-xs">
                    <colgroup>
                      <col className="w-[22%]" />
                      <col className="w-[13%]" />
                      <col className="w-[13%]" />
                      <col className="w-[13%]" />
                      <col className="w-[13%]" />
                      <col className="w-[26%]" />
                    </colgroup>
                    <thead className="bg-ink/5 text-ink/70 dark:bg-sand/10 dark:text-sand/70">
                      <tr>
                        <th className="px-3 py-2">Income</th>
                        <th className="px-3 py-2">Per day</th>
                        <th className="px-3 py-2">Per week</th>
                        <th className="px-3 py-2">Per fortnight</th>
                        <th className="px-3 py-2">Per month</th>
                        <th className="px-3 py-2">Per year</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/10 dark:divide-sand/10">
                      {incomeStreams.map((stream) => (
                        <tr key={stream.Id} className="hover:bg-ink/5 dark:hover:bg-sand/10">
                          <td className="px-3 py-2 font-semibold">{stream.Label}</td>
                          <td className="px-3 py-2">
                            {DisplayForPeriod(
                              stream,
                              "daily",
                              stream.GrossAmount,
                              stream.GrossPerDay
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {DisplayForPeriod(
                              stream,
                              "weekly",
                              stream.GrossAmount,
                              stream.GrossPerWeek
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {DisplayForPeriod(
                              stream,
                              "fortnightly",
                              stream.GrossAmount,
                              stream.GrossPerFortnight
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {DisplayForPeriod(
                              stream,
                              "monthly",
                              stream.GrossAmount,
                              stream.GrossPerMonth
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {DisplayForPeriod(
                              stream,
                              "yearly",
                              stream.GrossAmount,
                              stream.GrossPerYear
                            )}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-ink/5 font-semibold dark:bg-sand/10">
                        <td className="px-3 py-2">Total</td>
                        <td className="px-3 py-2">{FormatCurrency(totals.GrossPerDay)}</td>
                        <td className="px-3 py-2">{FormatCurrency(totals.GrossPerWeek)}</td>
                        <td className="px-3 py-2">{FormatCurrency(totals.GrossPerFortnight)}</td>
                        <td className="px-3 py-2">{FormatCurrency(totals.GrossPerMonth)}</td>
                        <td className="px-3 py-2">{FormatCurrency(totals.GrossPerYear)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {showAddIncomeForm && activeView === "summary" ? (
        <div
          id="income-form"
          className="rounded-3xl border border-ink/10 bg-white/95 p-4 shadow-glow backdrop-blur dark:border-sand/10 dark:bg-[#141311]/95"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-ink/50 dark:text-sand/60">
                Income details
              </p>
              <h3 className="font-display text-2xl">
                {editingStreamId ? "Edit income stream" : "Add income stream"}
              </h3>
            </div>
          </div>
          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={HandleIncomeSubmit}>
            <label className="text-sm">
              Income name
              <input
                type="text"
                required
                value={incomeForm.Label}
                onChange={(event) =>
                  setIncomeForm((prev) => ({ ...prev, Label: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 dark:border-sand/20 dark:bg-[#0f0e0c]"
              />
            </label>
            <label className="text-sm">
              Frequency
              <select
                value={incomeForm.Frequency}
                onChange={(event) =>
                  setIncomeForm((prev) => ({ ...prev, Frequency: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 dark:border-sand/20 dark:bg-[#0f0e0c]"
              >
                <option>Weekly</option>
                <option>Fortnightly</option>
                <option>Monthly</option>
                <option>Yearly</option>
              </select>
            </label>
            <label className="text-sm">
              Net amount
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={incomeForm.NetAmount}
                onChange={(event) =>
                  setIncomeForm((prev) => ({ ...prev, NetAmount: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 dark:border-sand/20 dark:bg-[#0f0e0c]"
              />
            </label>
            <label className="text-sm">
              Gross amount
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={incomeForm.GrossAmount}
                onChange={(event) =>
                  setIncomeForm((prev) => ({ ...prev, GrossAmount: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 dark:border-sand/20 dark:bg-[#0f0e0c]"
              />
            </label>
            <label className="text-sm">
              First pay date
              <input
                type="date"
                required
                value={incomeForm.FirstPayDate}
                onChange={(event) =>
                  setIncomeForm((prev) => ({ ...prev, FirstPayDate: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 dark:border-sand/20 dark:bg-[#0f0e0c]"
              />
            </label>
            <label className="text-sm">
              End date
              <input
                type="date"
                value={incomeForm.EndDate}
                onChange={(event) =>
                  setIncomeForm((prev) => ({ ...prev, EndDate: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 dark:border-sand/20 dark:bg-[#0f0e0c]"
              />
            </label>
            <label className="text-sm md:col-span-2">
              Notes
              <textarea
                value={incomeForm.Notes}
                onChange={(event) =>
                  setIncomeForm((prev) => ({ ...prev, Notes: event.target.value }))
                }
                className="mt-2 h-24 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 dark:border-sand/20 dark:bg-[#0f0e0c]"
              />
            </label>
            <div className="flex flex-wrap items-center justify-end gap-3 md:col-span-2">
              <button
                type="button"
                className="rounded-xl border border-ink/20 px-4 py-3 text-sm dark:border-sand/30"
                onClick={CancelIncomeEdit}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-moss px-4 py-3 text-sm font-semibold text-white"
              >
                {editingStreamId ? "Save changes" : "Save income stream"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {activeView === "calculator" ? (
        <>
          <div
            id="salary-calculator"
            className="rounded-3xl border border-ink/10 bg-white/95 p-5 shadow-glow backdrop-blur dark:border-sand/10 dark:bg-[#141311]/95"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-ink/50 dark:text-sand/60">
                  Salary calculator
                </p>
                <h2 className="font-display text-2xl">Estimate net and gross pay</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-ink/60 dark:text-sand/60">
                {calculatorResult?.IsEstimated ? (
                  <span className="rounded-full border border-ember/30 bg-ember/10 px-3 py-1 text-xs text-ember">
                    Rates estimated for {calculatorResult.TaxYear}
                  </span>
                ) : null}
              </div>
            </div>
            <p className="mt-2 text-xs text-ink/50 dark:text-sand/60">Auto updates as you type.</p>
          </div>

          <div className="rounded-3xl border border-ink/10 bg-white/95 p-5 shadow-glow backdrop-blur dark:border-sand/10 dark:bg-[#141311]/95">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60 dark:text-sand/60">
                Inputs
              </div>
              <div className="text-sm text-ink/70 dark:text-sand/70">Adjust salary and options</div>
            </div>

            <form className="mt-3 grid gap-3" onSubmit={HandleCalculatorSubmit}>
          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-sm">
              Tax year
              <select
                value={calculatorForm.TaxYear}
                onChange={(event) =>
                  setCalculatorForm((prev) => ({
                    ...prev,
                    TaxYear: event.target.value
                  }))
                }
                className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
              >
                {taxYears.map((year) => (
                  <option key={year.Label} value={year.Label}>
                    {year.Label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Super rate
              <div className="relative mt-2">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={calculatorForm.SuperRate}
                  onChange={(event) =>
                    setCalculatorForm((prev) => ({
                      ...prev,
                      SuperRate: event.target.value
                    }))
                  }
                  className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink/50 dark:text-sand/60">
                  %
                </span>
              </div>
            </label>
            <label className="flex items-center gap-2 text-sm md:mt-7">
              <input
                type="checkbox"
                checked={calculatorForm.IncludesSuper}
                onChange={(event) =>
                  setCalculatorForm((prev) => ({
                    ...prev,
                    IncludesSuper: event.target.checked
                  }))
                }
              />
              Salary includes super
            </label>
            <label className="flex items-center gap-2 text-sm md:mt-7">
              <input
                type="checkbox"
                checked={calculatorForm.PrivateHealth}
                onChange={(event) =>
                  setCalculatorForm((prev) => ({
                    ...prev,
                    PrivateHealth: event.target.checked
                  }))
                }
              />
              Private health cover
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-sm">
              Salary amount
              <div className="relative mt-2">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink/50 dark:text-sand/60">
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={FormatAmountInput(calculatorForm.SalaryAmount)}
                  onChange={(event) =>
                    setCalculatorForm((prev) => ({
                      ...prev,
                      SalaryAmount: NormalizeAmountInput(event.target.value)
                    }))
                  }
                  className="w-full rounded-xl border border-ink/15 bg-white py-3 pl-7 pr-4 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
                />
              </div>
            </label>
            <label className="text-sm">
              Pay cycle
              <select
                value={calculatorForm.SalaryFrequency}
                onChange={(event) =>
                  setCalculatorForm((prev) => ({
                    ...prev,
                    SalaryFrequency: event.target.value
                  }))
                }
                className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
              >
                <option>Hourly</option>
                <option>Daily</option>
                <option>Weekly</option>
                <option>Fortnightly</option>
                <option>Monthly</option>
                <option>Yearly</option>
              </select>
            </label>
            <label className="text-sm">
              Novated lease amount
              <div className="relative mt-2">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink/50 dark:text-sand/60">
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={FormatAmountInput(calculatorForm.NovatedLeaseAmount)}
                  onChange={(event) =>
                    setCalculatorForm((prev) => ({
                      ...prev,
                      NovatedLeaseAmount: NormalizeAmountInput(event.target.value)
                    }))
                  }
                  className="w-full rounded-xl border border-ink/15 bg-white py-3 pl-7 pr-4 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
                />
              </div>
            </label>
            <label className="text-sm">
              Lease frequency
              <select
                value={calculatorForm.NovatedLeaseFrequency}
                onChange={(event) =>
                  setCalculatorForm((prev) => ({
                    ...prev,
                    NovatedLeaseFrequency: event.target.value
                  }))
                }
                className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
              >
                <option>Weekly</option>
                <option>Fortnightly</option>
                <option>Monthly</option>
                <option>Yearly</option>
              </select>
            </label>
          </div>

          {calculatorForm.SalaryFrequency === "Hourly" ? (
            <div className="grid gap-3 md:grid-cols-4">
              <label className="text-sm">
                Hours per week
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={calculatorForm.HoursPerWeek}
                  onChange={(event) =>
                    setCalculatorForm((prev) => ({
                      ...prev,
                      HoursPerWeek: event.target.value
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
                />
              </label>
              <div className="hidden md:block" />
              <div className="hidden md:block" />
              <div className="hidden md:block" />
            </div>
          ) : null}

          {calculatorForm.SalaryFrequency === "Daily" ? (
            <div className="grid gap-3 md:grid-cols-4">
              <label className="text-sm">
                Days per week
                <input
                  type="number"
                  min="1"
                  max="7"
                  step="1"
                  value={calculatorForm.DaysPerWeek}
                  onChange={(event) =>
                    setCalculatorForm((prev) => ({
                      ...prev,
                      DaysPerWeek: event.target.value
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
                />
              </label>
              <div className="hidden md:block" />
              <div className="hidden md:block" />
              <div className="hidden md:block" />
            </div>
          ) : null}
            </form>
          </div>

          {calculatorResult ? (
            <div className="rounded-3xl border border-ink/10 bg-white/95 p-5 shadow-glow backdrop-blur dark:border-sand/10 dark:bg-[#141311]/95">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-xl">Salary calculations</h3>
                <div className="flex items-center gap-3 text-xs text-ink/50 dark:text-sand/60">
                  <span>Tax year {calculatorResult.TaxYear}</span>
                  <button
                    type="button"
                    className="rounded-full border border-ink/20 px-3 py-1 text-xs dark:border-sand/30"
                    onClick={() => setCalculatorApplyOpen(true)}
                  >
                    Use as income stream
                  </button>
                </div>
              </div>
              <div className="mt-4 overflow-auto rounded-2xl border border-ink/10 dark:border-sand/10">
                <table className="min-w-[760px] w-full table-fixed text-left text-xs">
                  <colgroup>
                    <col className="w-[28%]" />
                    <col className="w-[18%]" />
                    <col className="w-[18%]" />
                    <col className="w-[18%]" />
                    <col className="w-[18%]" />
                  </colgroup>
                  <thead className="bg-ink/5 text-ink/70 dark:bg-sand/10 dark:text-sand/70">
                    <tr>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Weekly</th>
                      <th className="px-3 py-2">Fortnightly</th>
                      <th className="px-3 py-2">Monthly</th>
                      <th className="px-3 py-2">Annually</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10 dark:divide-sand/10">
                    <tr>
                      <td className="px-3 py-2 font-semibold">Gross pay</td>
                      <td className="px-3 py-2">{FormatCurrency(calculatorResult.Gross.Weekly)}</td>
                      <td className="px-3 py-2">
                        {FormatCurrency(calculatorResult.Gross.Fortnightly)}
                      </td>
                      <td className="px-3 py-2">{FormatCurrency(calculatorResult.Gross.Monthly)}</td>
                      <td className="px-3 py-2">{FormatCurrency(calculatorResult.Gross.Yearly)}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-semibold">Net pay</td>
                      <td className="px-3 py-2">{FormatCurrency(calculatorResult.Net.Weekly)}</td>
                      <td className="px-3 py-2">
                        {FormatCurrency(calculatorResult.Net.Fortnightly)}
                      </td>
                      <td className="px-3 py-2">{FormatCurrency(calculatorResult.Net.Monthly)}</td>
                      <td className="px-3 py-2">{FormatCurrency(calculatorResult.Net.Yearly)}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">Income tax</td>
                      <td className="px-3 py-2">
                        {FormatCurrency(calculatorResult.IncomeTax.Weekly)}
                      </td>
                      <td className="px-3 py-2">
                        {FormatCurrency(calculatorResult.IncomeTax.Fortnightly)}
                      </td>
                      <td className="px-3 py-2">
                        {FormatCurrency(calculatorResult.IncomeTax.Monthly)}
                      </td>
                      <td className="px-3 py-2">{FormatCurrency(calculatorResult.IncomeTax.Yearly)}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">Medicare levy</td>
                      <td className="px-3 py-2">{FormatCurrency(calculatorResult.Medicare.Weekly)}</td>
                      <td className="px-3 py-2">
                        {FormatCurrency(calculatorResult.Medicare.Fortnightly)}
                      </td>
                      <td className="px-3 py-2">
                        {FormatCurrency(calculatorResult.Medicare.Monthly)}
                      </td>
                      <td className="px-3 py-2">{FormatCurrency(calculatorResult.Medicare.Yearly)}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">MLS</td>
                      <td className="px-3 py-2">{FormatCurrency(calculatorResult.Mls.Weekly)}</td>
                      <td className="px-3 py-2">{FormatCurrency(calculatorResult.Mls.Fortnightly)}</td>
                      <td className="px-3 py-2">{FormatCurrency(calculatorResult.Mls.Monthly)}</td>
                      <td className="px-3 py-2">{FormatCurrency(calculatorResult.Mls.Yearly)}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">Superannuation</td>
                      <td className="px-3 py-2">{FormatCurrency(calculatorResult.Super.Weekly)}</td>
                      <td className="px-3 py-2">
                        {FormatCurrency(calculatorResult.Super.Fortnightly)}
                      </td>
                      <td className="px-3 py-2">{FormatCurrency(calculatorResult.Super.Monthly)}</td>
                      <td className="px-3 py-2">{FormatCurrency(calculatorResult.Super.Yearly)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4 rounded-2xl border border-ink/10 bg-ink/5 p-4 text-xs text-ink/70 dark:border-sand/10 dark:bg-sand/10 dark:text-sand/70">
                <div className="font-semibold text-ink/70 dark:text-sand/70">Annual details</div>
                <div className="mt-2 space-y-1">
                  <div>Salary annualized: {FormatCurrency(calculatorResult.SalaryAnnual)}</div>
                  <div>Taxable income: {FormatCurrency(calculatorResult.TaxableAnnual)}</div>
                  <div>Novated lease: {FormatCurrency(calculatorResult.NovatedLeaseAnnual)}</div>
                  <div>Income tax: {FormatCurrency(calculatorResult.IncomeTaxAnnual)}</div>
                  <div>Medicare levy: {FormatCurrency(calculatorResult.MedicareAnnual)}</div>
                  <div>MLS: {FormatCurrency(calculatorResult.MlsAnnual)}</div>
                  <div>Superannuation: {FormatCurrency(calculatorResult.SuperAnnual)}</div>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {calculatorApplyOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-4 py-6">
          <div className="w-full max-w-xl rounded-3xl border border-ink/10 bg-white p-6 shadow-2xl dark:border-sand/10 dark:bg-[#141311]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-ink/50 dark:text-sand/60">
                  Salary calculator
                </p>
                <h3 className="font-display text-2xl">Use calculator results</h3>
              </div>
              <button
                type="button"
                className="rounded-full border border-ink/20 px-3 py-1 text-xs dark:border-sand/30"
                onClick={() => setCalculatorApplyOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="mt-6 space-y-4 text-sm">
              <label className="text-sm">
                Apply as
                <select
                  value={calculatorApplyMode}
                  onChange={(event) => setCalculatorApplyMode(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
                >
                  <option value="create">New income stream</option>
                  <option value="update">Update existing income</option>
                </select>
              </label>
              <label className="text-sm">
                Scenario type
                <select
                  value={calculatorScenarioType}
                  onChange={(event) => setCalculatorScenarioType(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
                >
                  <option value="net">Net</option>
                  <option value="gross">Gross</option>
                </select>
              </label>
              <label className="text-sm">
                Target income stream
                <select
                  value={calculatorTargetStream}
                  onChange={(event) => setCalculatorTargetStream(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
                >
                  <option value="">Select</option>
                  {incomeStreams.map((stream) => (
                    <option key={stream.Id} value={stream.Id}>
                      {stream.Label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Use calculator frequency
                <select
                  value={calculatorForm.IncomeFrequency}
                  onChange={(event) =>
                    setCalculatorForm((prev) => ({
                      ...prev,
                      IncomeFrequency: event.target.value
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
                >
                  <option>Weekly</option>
                  <option>Fortnightly</option>
                  <option>Monthly</option>
                  <option>Yearly</option>
                </select>
              </label>
              <label className="text-sm">
                Effective date
                <input
                  type="date"
                  value={calculatorEffectiveDate}
                  onChange={(event) => setCalculatorEffectiveDate(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
                />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                className="rounded-xl border border-ink/20 px-4 py-2 text-sm dark:border-sand/30"
                onClick={() => setCalculatorApplyOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl bg-moss px-4 py-2 text-sm font-semibold text-white"
                onClick={ApplyCalculatorToIncome}
              >
                Use as income stream
              </button>
              <button
                type="button"
                className="rounded-xl border border-ink/20 px-4 py-2 text-sm"
                onClick={ApplyCalculatorToScenario}
              >
                Use in scenario
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeView === "whatif" ? (
        <div
          id="what-if"
          className="rounded-3xl border border-ink/10 bg-white/95 p-5 shadow-glow backdrop-blur dark:border-sand/10 dark:bg-[#141311]/95"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-ink/50 dark:text-sand/60">
                Scenario mode
              </p>
              <h2 className="font-display text-2xl">What-if analysis</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-ink/60 dark:text-sand/60">
              <button
                type="button"
                className="rounded-full border border-ink/20 px-3 py-1 text-xs dark:border-sand/30"
                onClick={() => setScenarioEnabled((current) => !current)}
              >
                {scenarioEnabled ? "Exit scenario" : "Enter scenario"}
              </button>
              <div className="relative">
                <button
                  type="button"
                  className="rounded-full border border-ink/20 px-3 py-1 text-xs dark:border-sand/30"
                  onClick={() => setScenarioDropdownOpen((current) => !current)}
                >
                  Load scenario
                </button>
                {scenarioDropdownOpen ? (
                  <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-ink/10 bg-white p-3 text-sm shadow-xl dark:border-sand/10 dark:bg-[#141311]">
                    <input
                      type="text"
                      placeholder="Search scenarios"
                      value={scenarioSearch}
                      onChange={(event) => setScenarioSearch(event.target.value)}
                      className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-xs dark:border-sand/20 dark:bg-[#0f0e0c]"
                    />
                    <div className="mt-3 space-y-2">
                      {filteredScenarios.length === 0 ? (
                        <div className="text-xs text-ink/50 dark:text-sand/60">No scenarios</div>
                      ) : (
                        filteredScenarios.map((scenario) => (
                          <div key={scenario.Id} className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              className="flex-1 text-left text-sm"
                              onClick={() => {
                                LoadScenario(scenario);
                                setScenarioDropdownOpen(false);
                              }}
                            >
                              {scenario.Name}
                            </button>
                            <button
                              type="button"
                              className="text-xs text-ember"
                              onClick={() => DeleteScenarioLocal(scenario.Id)}
                            >
                              Delete
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <label className="text-sm">
              Scenario name
              <input
                type="text"
                value={scenarioName}
                onChange={(event) => setScenarioName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
              />
            </label>
            <label className="text-sm">
              Scenario type
              <select
                value={scenarioType}
                onChange={(event) => setScenarioType(event.target.value)}
                className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm dark:border-sand/20 dark:bg-[#0f0e0c]"
              >
                <option value="net">Net</option>
                <option value="gross">Gross</option>
              </select>
            </label>
            <div className="flex items-end gap-3">
              <button
                type="button"
                className="rounded-xl border border-ink/20 px-4 py-3 text-sm dark:border-sand/30"
                onClick={SaveScenario}
              >
                Save scenario
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-auto rounded-2xl border border-ink/10 dark:border-sand/10">
            <table className="min-w-[900px] w-full table-fixed text-left text-xs">
              <colgroup>
                <col className="w-[30%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[10%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
              </colgroup>
              <thead className="bg-ink/5 text-ink/70 dark:bg-sand/10 dark:text-sand/70">
                <tr>
                  <th className="px-3 py-2">Income stream</th>
                  <th className="px-3 py-2">Current amount</th>
                  <th className="px-3 py-2">New amount</th>
                  <th className="px-3 py-2">Frequency</th>
                  <th className="px-3 py-2">Include</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10 dark:divide-sand/10">
                {incomeStreams.map((stream) => {
                  const adjustment = scenarioAdjustments[stream.Id] || {
                    Amount: "",
                    Frequency: stream.Frequency
                  };
                  const included = scenarioSelectedIds.includes(stream.Id);
                  const currentValue = GetPeriodValue(stream, scenarioType === "net", adjustment.Frequency);
                  return (
                    <tr key={stream.Id} className="hover:bg-ink/5 dark:hover:bg-sand/10">
                      <td className="px-3 py-2 font-semibold">{stream.Label}</td>
                      <td className="px-3 py-2">{FormatCurrency(currentValue)}</td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="$0.00"
                          value={FormatAmountInput(adjustment.Amount)}
                          onChange={(event) => {
                            const value = NormalizeAmountInput(event.target.value);
                            setScenarioAdjustments((current) => ({
                              ...current,
                              [stream.Id]: {
                                ...adjustment,
                                Amount: value
                              }
                            }));
                            if (!scenarioSelectedIds.includes(stream.Id)) {
                              setScenarioSelectedIds((current) => [...current, stream.Id]);
                            }
                          }}
                          className="w-full rounded-md border border-ink/15 bg-white px-2 py-1 text-xs dark:border-sand/20 dark:bg-[#0f0e0c]"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={adjustment.Frequency || stream.Frequency}
                          onChange={(event) =>
                            setScenarioAdjustments((current) => ({
                              ...current,
                              [stream.Id]: {
                                ...adjustment,
                                Frequency: event.target.value
                              }
                            }))
                          }
                          className="w-full rounded-md border border-ink/15 bg-white px-2 py-1 text-xs dark:border-sand/20 dark:bg-[#0f0e0c]"
                        >
                          <option>Weekly</option>
                          <option>Fortnightly</option>
                          <option>Monthly</option>
                          <option>Yearly</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={included}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setScenarioSelectedIds((current) => [...current, stream.Id]);
                            } else {
                              setScenarioSelectedIds((current) =>
                                current.filter((id) => id !== stream.Id)
                              );
                            }
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 text-xs text-ink/60 dark:text-sand/60">
                        {included ? "Included" : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 overflow-auto rounded-2xl border border-ink/10 dark:border-sand/10">
            <table className="min-w-[720px] w-full table-fixed text-left text-xs">
              <colgroup>
                <col className="w-[30%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead className="bg-ink/5 text-ink/70 dark:bg-sand/10 dark:text-sand/70">
                <tr>
                  <th className="px-3 py-2">Totals</th>
                  <th className="px-3 py-2">Per day</th>
                  <th className="px-3 py-2">Per week</th>
                  <th className="px-3 py-2">Per fortnight</th>
                  <th className="px-3 py-2">Per month</th>
                  <th className="px-3 py-2">Per year</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10 dark:divide-sand/10">
                <tr>
                  <td className="px-3 py-2 font-semibold">Actual selected</td>
                  <td className="px-3 py-2">{FormatCurrency(scenarioTotals.SelectedTotals.PerDay)}</td>
                  <td className="px-3 py-2">{FormatCurrency(scenarioTotals.SelectedTotals.PerWeek)}</td>
                  <td className="px-3 py-2">
                    {FormatCurrency(scenarioTotals.SelectedTotals.PerFortnight)}
                  </td>
                  <td className="px-3 py-2">{FormatCurrency(scenarioTotals.SelectedTotals.PerMonth)}</td>
                  <td className="px-3 py-2">{FormatCurrency(scenarioTotals.SelectedTotals.PerYear)}</td>
                </tr>
                <tr className="bg-ink/5 font-semibold dark:bg-sand/10">
                  <td className="px-3 py-2">Scenario total</td>
                  <td className="px-3 py-2">{FormatCurrency(scenarioTotals.ScenarioTotals.PerDay)}</td>
                  <td className="px-3 py-2">{FormatCurrency(scenarioTotals.ScenarioTotals.PerWeek)}</td>
                  <td className="px-3 py-2">
                    {FormatCurrency(scenarioTotals.ScenarioTotals.PerFortnight)}
                  </td>
                  <td className="px-3 py-2">{FormatCurrency(scenarioTotals.ScenarioTotals.PerMonth)}</td>
                  <td className="px-3 py-2">{FormatCurrency(scenarioTotals.ScenarioTotals.PerYear)}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-semibold">Delta</td>
                  <td className="px-3 py-2">{FormatCurrency(scenarioTotals.DeltaTotals.PerDay)}</td>
                  <td className="px-3 py-2">{FormatCurrency(scenarioTotals.DeltaTotals.PerWeek)}</td>
                  <td className="px-3 py-2">
                    {FormatCurrency(scenarioTotals.DeltaTotals.PerFortnight)}
                  </td>
                  <td className="px-3 py-2">{FormatCurrency(scenarioTotals.DeltaTotals.PerMonth)}</td>
                  <td className="px-3 py-2">{FormatCurrency(scenarioTotals.DeltaTotals.PerYear)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
