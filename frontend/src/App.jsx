import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  CreateIncomeStream,
  ListIncomeStreams,
  Login,
  Register,
  UpdateIncomeStream,
  Refresh,
  ListScenarios,
  CreateScenario,
  DeleteScenario,
  ListTaxYears,
  EstimateTax
} from "./lib/api.js";

const InitialIncomeForm = {
  Label: "",
  NetAmount: "",
  GrossAmount: "",
  FirstPayDate: "",
  Frequency: "Monthly",
  EndDate: "",
  Notes: ""
};

function FormatCurrency(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  const number = Number(value);
  if (Number.isNaN(number)) {
    return "-";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(number);
}

function FormatCurrencyWithDecimals(value, showDecimals) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  const number = Number(value);
  if (Number.isNaN(number)) {
    return "-";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0
  }).format(number);
}

function FormatDate(value) {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString();
}

function ToNumber(value) {
  const number = Number(value);
  return Number.isNaN(number) ? 0 : number;
}

function FormatAmountInput(value) {
  if (!value) {
    return "";
  }
  const raw = String(value);
  const parts = raw.split(".");
  const integerPart = parts[0] || "0";
  const decimalPart = parts.length > 1 ? parts[1] : "";
  const formattedInteger = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(Number(integerPart));
  if (raw.endsWith(".")) {
    return `${formattedInteger}.`;
  }
  if (decimalPart.length > 0) {
    return `${formattedInteger}.${decimalPart}`;
  }
  return formattedInteger;
}

function NormalizeAmountInput(rawValue) {
  if (!rawValue) {
    return "";
  }
  let cleanedInput = String(rawValue).replace(/\s/g, "");
  const hasDot = cleanedInput.includes(".");
  const hasComma = cleanedInput.includes(",");
  if (hasDot) {
    cleanedInput = cleanedInput.replace(/,/g, "");
  } else if (hasComma) {
    const lastCommaIndex = cleanedInput.lastIndexOf(",");
    const decimals = cleanedInput.slice(lastCommaIndex + 1);
    if (/^\d{1,2}$/.test(decimals)) {
      cleanedInput = cleanedInput.replace(/\./g, "");
      cleanedInput = cleanedInput.replace(/,/g, ".");
    } else {
      cleanedInput = cleanedInput.replace(/,/g, "");
    }
  }
  const cleaned = cleanedInput.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    return `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}`;
  }
  if (parts.length === 2) {
    return `${parts[0]}.${parts[1].slice(0, 2)}`;
  }
  return parts[0];
}

function NormalizeFrequency(value) {
  return (value || "").toLowerCase();
}

function DisplayForPeriod(stream, periodKey, amountValue, perValue) {
  const frequency = NormalizeFrequency(stream.Frequency);
  if (frequency === periodKey) {
    return FormatCurrency(amountValue);
  }
  return FormatCurrency(perValue);
}

function GetDaysInFinancialYear() {
  const today = new Date();
  const fyStart = new Date(today.getFullYear(), 6, 1);
  if (today < fyStart) {
    fyStart.setFullYear(today.getFullYear() - 1);
  }
  const fyEnd = new Date(fyStart.getFullYear() + 1, 6, 1);
  const days = Math.round((fyEnd - fyStart) / (1000 * 60 * 60 * 24));
  return days || 365;
}

function GetCalculatorPeriodAmount(result, field, frequency, daysInYear) {
  if (!result) {
    return null;
  }
  const freq = NormalizeFrequency(frequency);
  const annualValue = field === "Net" ? result.NetAnnual : result.GrossAnnual;
  const periods = result[field];
  if (!periods) {
    return null;
  }
  if (freq === "daily") {
    return annualValue / daysInYear;
  }
  if (freq === "weekly") {
    return periods.Weekly;
  }
  if (freq === "fortnightly") {
    return periods.Fortnightly;
  }
  if (freq === "monthly") {
    return periods.Monthly;
  }
  if (freq === "yearly") {
    return periods.Yearly;
  }
  return periods.Fortnightly;
}

function FrequencyToAnnualMultiplier(frequency, daysInYear) {
  const freq = NormalizeFrequency(frequency);
  return {
    daily: daysInYear,
    weekly: 52,
    fortnightly: 26,
    monthly: 12,
    quarterly: 4,
    yearly: 1
  }[freq] || 0;
}

function AnnualizedScenarioBreakdown(amount, frequency, daysInYear) {
  const annual = amount * FrequencyToAnnualMultiplier(frequency, daysInYear);
  return {
    PerYear: annual,
    PerMonth: annual / 12,
    PerFortnight: annual / 26,
    PerWeek: annual / 52,
    PerDay: annual / daysInYear
  };
}

function GetPeriodValue(stream, isNet, frequency) {
  const freq = NormalizeFrequency(frequency);
  if (freq === "daily") {
    return isNet ? stream.NetPerDay : stream.GrossPerDay;
  }
  if (freq === "weekly") {
    return isNet ? stream.NetPerWeek : stream.GrossPerWeek;
  }
  if (freq === "fortnightly") {
    return isNet ? stream.NetPerFortnight : stream.GrossPerFortnight;
  }
  if (freq === "monthly") {
    return isNet ? stream.NetPerMonth : stream.GrossPerMonth;
  }
  if (freq === "yearly") {
    return isNet ? stream.NetPerYear : stream.GrossPerYear;
  }
  return 0;
}

export default function App() {
  const [tokens, setTokens] = useState(() => {
    const saved = localStorage.getItem("budgetTokens");
    return saved ? JSON.parse(saved) : null;
  });
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    Email: "",
    Password: "",
    HouseholdName: ""
  });
  const [incomeForm, setIncomeForm] = useState(InitialIncomeForm);
  const [incomeStreams, setIncomeStreams] = useState([]);
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [loading, setLoading] = useState(false);
  const [layoutMode, setLayoutMode] = useState("auto");
  const [isCompactAuto, setIsCompactAuto] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(() => {
    const saved = localStorage.getItem("navCollapsed");
    return saved === "true";
  });
  const [navOpen, setNavOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const [incomeNavOpen, setIncomeNavOpen] = useState(false);
  const [showAddIncomeForm, setShowAddIncomeForm] = useState(false);
  const [layoutNavOpen, setLayoutNavOpen] = useState(false);
  const [accountNavOpen, setAccountNavOpen] = useState(false);
  const lastFetchTokenRef = useRef(null);
  const tokensRef = useRef(tokens);
  const refreshPromiseRef = useRef(null);
  const [editingStreamId, setEditingStreamId] = useState(null);
  const [activeMenu, setActiveMenu] = useState("Income");
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
  const [calculatorLoading, setCalculatorLoading] = useState(false);
  const [calculatorShowDecimals, setCalculatorShowDecimals] = useState(true);
  const [calculatorApplyOpen, setCalculatorApplyOpen] = useState(false);
  const [calculatorApplyMode, setCalculatorApplyMode] = useState("create");
  const [calculatorTargetStream, setCalculatorTargetStream] = useState("");
  const [calculatorEffectiveDate, setCalculatorEffectiveDate] = useState("");
  const [calculatorForm, setCalculatorForm] = useState({
    SalaryAmount: "",
    SalaryFrequency: "Yearly",
    IncludesSuper: false,
    SuperRate: "11.5",
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
    if (tokens) {
      localStorage.setItem("budgetTokens", JSON.stringify(tokens));
    } else {
      localStorage.removeItem("budgetTokens");
    }
    tokensRef.current = tokens;
    if (tokens?.AccessToken !== lastFetchTokenRef.current) {
      lastFetchTokenRef.current = null;
    }
  }, [tokens]);

  useEffect(() => {
    localStorage.setItem("navCollapsed", navCollapsed ? "true" : "false");
  }, [navCollapsed]);

  useEffect(() => {
    const updateSize = () => {
      setIsCompactAuto(window.innerWidth <= 1024);
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (activeMenu === "What-if" && !scenarioEnabled) {
      setScenarioEnabled(true);
    }
  }, [activeMenu, scenarioEnabled]);

  useEffect(() => {
    if (!tokens?.AccessToken || activeMenu !== "What-if") {
      return;
    }
    ExecuteWithRefresh((accessToken) => ListScenarios(accessToken))
      .then(setSavedScenarios)
      .catch((error) => {
        setStatus({ type: "error", message: error.message });
      });
  }, [tokens, activeMenu]);

  useEffect(() => {
    if (!tokens?.AccessToken || activeMenu !== "Calculator") {
      return;
    }
    ExecuteWithRefresh((accessToken) => ListTaxYears(accessToken))
      .then((years) => {
        setTaxYears(years);
        if (!calculatorForm.TaxYear) {
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
      .catch((error) => {
        setStatus({ type: "error", message: error.message });
      });
  }, [tokens, activeMenu, calculatorForm.TaxYear]);

  useEffect(() => {
    if (!tokens?.AccessToken || activeMenu !== "Calculator") {
      return;
    }
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
    tokens,
    activeMenu,
    calculatorForm.SalaryAmount,
    calculatorForm.SalaryFrequency,
    calculatorForm.IncludesSuper,
    calculatorForm.SuperRate,
    calculatorForm.PrivateHealth,
    calculatorForm.NovatedLeaseAmount,
    calculatorForm.NovatedLeaseFrequency,
    calculatorForm.HoursPerWeek,
    calculatorForm.DaysPerWeek,
    calculatorForm.TaxYear
  ]);

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
    if (!tokens?.AccessToken) {
      setIncomeStreams([]);
      lastFetchTokenRef.current = null;
      return;
    }
    if (lastFetchTokenRef.current === tokens.AccessToken) {
      return;
    }
    lastFetchTokenRef.current = tokens.AccessToken;
    setLoading(true);
    ExecuteWithRefresh((accessToken) => ListIncomeStreams(accessToken))
      .then(setIncomeStreams)
      .catch((error) => {
        setStatus({ type: "error", message: error.message });
      })
      .finally(() => setLoading(false));
  }, [tokens]);

  const summary = useMemo(() => {
    const totalNet = incomeStreams.reduce(
      (sum, item) => sum + Number(item.NetAmount || 0),
      0
    );
    const totalGross = incomeStreams.reduce(
      (sum, item) => sum + Number(item.GrossAmount || 0),
      0
    );
    return { totalNet, totalGross };
  }, [incomeStreams]);

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
        const deltaAmount = ToNumber(adjustment.Amount) - ToNumber(
          GetPeriodValue(stream, isNet, rowFrequency)
        );
        if (deltaAmount === 0) {
          return acc;
        }
        const delta = AnnualizedScenarioBreakdown(
          deltaAmount,
          rowFrequency,
          daysInYear
        );
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

  const isCompact = layoutMode === "auto" ? isCompactAuto : layoutMode === "compact";

  const HandleAuthSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setStatus({ type: "idle", message: "" });
    try {
      if (authMode === "register") {
        await Register(authForm);
        setAuthMode("login");
        setStatus({ type: "success", message: "Account created. Sign in next." });
      } else {
        const result = await Login({
          Email: authForm.Email,
          Password: authForm.Password
        });
        setTokens(result);
      }
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const RefreshTokens = async () => {
    if (!tokensRef.current?.RefreshToken) {
      throw new Error("Missing refresh token");
    }
    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = Refresh(tokensRef.current.RefreshToken)
        .then((newTokens) => {
          setTokens(newTokens);
          return newTokens;
        })
        .finally(() => {
          refreshPromiseRef.current = null;
        });
    }
    return refreshPromiseRef.current;
  };

  const ExecuteWithRefresh = async (fn) => {
    if (!tokensRef.current?.AccessToken) {
      throw new Error("Missing access token");
    }
    try {
      return await fn(tokensRef.current.AccessToken);
    } catch (error) {
      if (error.status !== 401) {
        throw error;
      }
      try {
        const newTokens = await RefreshTokens();
        return await fn(newTokens.AccessToken);
      } catch (refreshError) {
        setTokens(null);
        setStatus({ type: "error", message: "Session expired. Sign in again." });
        throw refreshError;
      }
    }
  };

  const HandleIncomeSubmit = async (event) => {
    event.preventDefault();
    if (!tokens?.AccessToken) {
      setStatus({ type: "error", message: "Sign in to add income streams." });
      return;
    }
    setLoading(true);
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
        const updated = await ExecuteWithRefresh((accessToken) =>
          UpdateIncomeStream(accessToken, editingStreamId, payload)
        );
        setIncomeStreams((current) =>
          current.map((stream) => (stream.Id === updated.Id ? updated : stream))
        );
      } else {
        const created = await ExecuteWithRefresh((accessToken) =>
          CreateIncomeStream(accessToken, payload)
        );
        setIncomeStreams((current) => [created, ...current]);
      }
      setIncomeForm(InitialIncomeForm);
      setShowAddIncomeForm(false);
      setEditingStreamId(null);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const StartAddIncome = () => {
    setEditingStreamId(null);
    setIncomeForm(InitialIncomeForm);
    setShowAddIncomeForm(true);
    setIncomeNavOpen(false);
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

  async function CalculateTaxEstimate() {
    if (!tokens?.AccessToken) {
      setStatus({ type: "error", message: "Sign in to run the calculator." });
      return;
    }
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
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setCalculatorLoading(false);
    }
  }

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
    const netAmount = GetCalculatorPeriodAmount(
      calculatorResult,
      "Net",
      frequency,
      daysInYear
    );
    const grossAmount = GetCalculatorPeriodAmount(
      calculatorResult,
      "Gross",
      frequency,
      daysInYear
    );
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
      setActiveMenu("Income");
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

    setActiveMenu("Income");
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
    } catch (error) {
      setStatus({ type: "error", message: error.message });
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
      setSavedScenarios((current) => current.filter((scenario) => scenario.Id !== scenarioId));
    } catch (error) {
      setStatus({ type: "error", message: error.message });
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

  const navItems = [
    { label: "Dashboard", enabled: false, icon: "dashboard" },
    { label: "Income", enabled: true, icon: "income" },
    { label: "Expenses", enabled: false, icon: "expenses" },
    { label: "Allocations", enabled: false, icon: "allocations" },
    { label: "Settings", enabled: false, icon: "settings" }
  ];
  const accountOptions = [
    "Account",
    "Profile (coming soon!)",
    "Security (coming soon!)",
    "Notifications (coming soon!)"
  ];
  const iconBase = "h-5 w-5";
  const icons = {
    household: (
      <svg viewBox="0 0 24 24" className={iconBase} aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 3l9 7v10a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2V10l9-7z"
        />
      </svg>
    ),
    dashboard: (
      <svg viewBox="0 0 24 24" className={iconBase} aria-hidden="true">
        <path
          fill="currentColor"
          d="M4 13h7v7H4v-7zm9-9h7v7h-7V4zM4 4h7v7H4V4zm9 9h7v7h-7v-7z"
        />
      </svg>
    ),
    income: (
      <svg viewBox="0 0 24 24" className={iconBase} aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 3l9 9-1.4 1.4L13 6.8V21h-2V6.8L4.4 13.4 3 12l9-9z"
        />
      </svg>
    ),
    calculator: (
      <svg viewBox="0 0 24 24" className={iconBase} aria-hidden="true">
        <path
          fill="currentColor"
          d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 2v4h10V4H7zm0 6v8h10v-8H7zm2 2h2v2H9v-2zm4 0h2v2h-2v-2zm-4 4h2v2H9v-2zm4 0h2v2h-2v-2z"
        />
      </svg>
    ),
    expenses: (
      <svg viewBox="0 0 24 24" className={iconBase} aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 21l-9-9 1.4-1.4L11 17.2V3h2v14.2l6.6-6.6L21 12l-9 9z"
        />
      </svg>
    ),
    allocations: (
      <svg viewBox="0 0 24 24" className={iconBase} aria-hidden="true">
        <path
          fill="currentColor"
          d="M3 3h8v8H3V3zm10 0h8v5h-8V3zM13 10h8v11h-8V10zM3 13h8v8H3v-8z"
        />
      </svg>
    ),
    settings: (
      <svg viewBox="0 0 24 24" className={iconBase} aria-hidden="true">
        <path
          fill="currentColor"
          d="M19.4 13.5a7.5 7.5 0 0 0 .1-1.5 7.5 7.5 0 0 0-.1-1.5l2-1.6-2-3.4-2.4.9a7.6 7.6 0 0 0-2.6-1.5l-.4-2.5h-4l-.4 2.5a7.6 7.6 0 0 0-2.6 1.5l-2.4-.9-2 3.4 2 1.6a7.5 7.5 0 0 0-.1 1.5 7.5 7.5 0 0 0 .1 1.5l-2 1.6 2 3.4 2.4-.9a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4.9 2-3.4-2-1.6zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"
        />
      </svg>
    ),
    layout: (
      <svg viewBox="0 0 24 24" className={iconBase} aria-hidden="true">
        <path
          fill="currentColor"
          d="M4 5h7v6H4V5zm9 0h7v14h-7V5zM4 13h7v6H4v-6z"
        />
      </svg>
    ),
    theme: (
      <svg viewBox="0 0 24 24" className={iconBase} aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 4a8 8 0 1 0 8 8c0-.6-.1-1.1-.2-1.7a6.5 6.5 0 0 1-7.8-7.8A8 8 0 0 0 12 4z"
        />
      </svg>
    ),
    sun: (
      <svg viewBox="0 0 24 24" className={iconBase} aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-4h2v3h-2V3zm0 18h2v-3h-2v3zm9-9h-3v2h3v-2zM6 12H3v2h3v-2zm12.4-6.4l-2.1 2.1 1.4 1.4 2.1-2.1-1.4-1.4zM6.3 17.7l-2.1 2.1 1.4 1.4 2.1-2.1-1.4-1.4zM19.8 19.1l-2.1-2.1-1.4 1.4 2.1 2.1 1.4-1.4zM7.7 7.7L5.6 5.6 4.2 7l2.1 2.1 1.4-1.4z"
        />
      </svg>
    ),
    moon: (
      <svg viewBox="0 0 24 24" className={iconBase} aria-hidden="true">
        <path
          fill="currentColor"
          d="M20.1 14.7A8 8 0 0 1 9.3 3.9a8.5 8.5 0 1 0 10.8 10.8z"
        />
      </svg>
    ),
    logout: (
      <svg viewBox="0 0 24 24" className={iconBase} aria-hidden="true">
        <path
          fill="currentColor"
          d="M10 4h8v16h-8v-2h6V6h-6V4zm-1.4 4.6L12 12l-3.4 3.4-1.4-1.4L9.4 13H4v-2h5.4l-2.2-2.2 1.4-1.4z"
        />
      </svg>
    ),
    chevron: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path fill="currentColor" d="M9 6l6 6-6 6-1.4-1.4L12.2 12 7.6 7.4 9 6z" />
      </svg>
    ),
    chevronDown: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path fill="currentColor" d="M6 9l6 6 6-6 1.4 1.4L12 17.8 4.6 10.4 6 9z" />
      </svg>
    ),
    plus: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path fill="currentColor" d="M11 5h2v14h-2zM5 11h14v2H5z" />
      </svg>
    ),
    collapse: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path fill="currentColor" d="M7 7h10v2H7V7zm0 8h10v2H7v-2z" />
      </svg>
    )
  };

  return (
    <div className="min-h-screen bg-sand text-ink font-body dark:bg-[#0c0b0a] dark:text-sand">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-clay/60 blur-3xl dark:bg-[#2a2a2a]/60" />
        <div className="absolute top-40 -right-10 h-80 w-80 rounded-full bg-ember/30 blur-3xl dark:bg-[#3a2f2a]/40" />
      </div>

      <main className="relative mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-8 px-6 py-10 lg:flex-row">
        {!tokens ? (
          <section className="fade-up flex w-full flex-col gap-6 lg:w-5/12">
          <header className="space-y-3">
            <p className="font-display text-sm uppercase tracking-[0.3em] text-moss">
              Household Budget
            </p>
            <h1 className="font-display text-4xl leading-tight md:text-5xl">
              Map every income stream and keep the household aligned.
            </h1>
            <p className="text-base text-ink/70">
              Sign in, add household income, and see net versus gross totals at a glance.
            </p>
          </header>

          <div className="rounded-3xl border border-ink/10 bg-white/90 p-6 shadow-glow backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-lg">Access</p>
                <p className="text-sm text-ink/60">Secure sign in for shared households.</p>
              </div>
              {tokens ? (
                <button
                  type="button"
                  className="rounded-full border border-ink/20 px-4 py-2 text-sm"
                  onClick={() => setTokens(null)}
                >
                  Sign out
                </button>
              ) : null}
            </div>

            {!tokens ? (
              <form className="mt-6 space-y-4" onSubmit={HandleAuthSubmit}>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`flex-1 rounded-full px-4 py-2 text-sm ${
                      authMode === "login"
                        ? "bg-moss text-white"
                        : "border border-ink/20"
                    }`}
                    onClick={() => setAuthMode("login")}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    className={`flex-1 rounded-full px-4 py-2 text-sm ${
                      authMode === "register"
                        ? "bg-moss text-white"
                        : "border border-ink/20"
                    }`}
                    onClick={() => setAuthMode("register")}
                  >
                    Register
                  </button>
                </div>
                <label className="block text-sm">
                  Email
                  <input
                    type="email"
                    name="email"
                    autoComplete="username"
                    required
                    value={authForm.Email}
                    onChange={(event) =>
                      setAuthForm((prev) => ({ ...prev, Email: event.target.value }))
                    }
                    className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3"
                  />
                </label>
                <label className="block text-sm">
                  Password
                  <input
                    type="password"
                    name="password"
                    autoComplete={
                      authMode === "register" ? "new-password" : "current-password"
                    }
                    required
                    value={authForm.Password}
                    onChange={(event) =>
                      setAuthForm((prev) => ({ ...prev, Password: event.target.value }))
                    }
                    className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3"
                  />
                </label>
                {authMode === "register" ? (
                  <label className="block text-sm">
                    Household name
                    <input
                      type="text"
                      name="household"
                      autoComplete="organization"
                      required
                      value={authForm.HouseholdName}
                      onChange={(event) =>
                        setAuthForm((prev) => ({
                          ...prev,
                          HouseholdName: event.target.value
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3"
                    />
                  </label>
                ) : null}
                <button
                  type="submit"
                  className="w-full rounded-xl bg-ember px-4 py-3 text-sm font-semibold text-white"
                  disabled={loading}
                >
                  {authMode === "register" ? "Create account" : "Sign in"}
                </button>
              </form>
            ) : (
              <div className="mt-6 rounded-2xl bg-sand/60 p-4 text-sm">
                You are signed in. Add income streams on the right.
              </div>
            )}

            {status.message ? (
              <div
                className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                  status.type === "error"
                    ? "bg-ember/10 text-ember"
                    : "bg-moss/10 text-moss"
                }`}
              >
                {status.message}
              </div>
            ) : null}
          </div>
        </section>
        ) : null}

        {tokens ? (
          <div className="fade-up-delay flex w-full gap-6">
            {!isCompact ? (
              <aside
                className={`sticky top-6 z-40 hidden h-[calc(100vh-3rem)] flex-col justify-between rounded-3xl bg-ink px-4 py-6 text-sand shadow-glow lg:flex overflow-visible ${
                  navCollapsed ? "w-20" : "w-64"
                }`}
              >
                  <div className="space-y-5">
                  <div className="flex items-center justify-between px-4 py-2">
                    <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-sand/60">
                      <span className="inline-flex h-5 w-5 items-center justify-center text-sand/80">
                        {icons.household}
                      </span>
                      {!navCollapsed ? "Household" : null}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {navItems.map((item) => (
                      <div key={item.label} className="relative">
                        <button
                          type="button"
                        className={`w-full rounded-2xl px-4 py-3 text-left text-sm ${
                          item.label === activeMenu
                            ? "bg-sand/10 text-sand"
                            : "text-sand/60"
                        } ${item.enabled ? "" : "cursor-not-allowed opacity-60"}`}
                        disabled={!item.enabled}
                        onClick={() => {
                          if (!item.enabled) {
                            return;
                          }
                          setActiveMenu(item.label);
                          if (item.label === "Income") {
                            setIncomeNavOpen((current) => !current);
                          } else {
                            setIncomeNavOpen(false);
                          }
                          setLayoutNavOpen(false);
                          setAccountNavOpen(false);
                        }}
                      >
                          <span className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-3">
                              <span className="text-sand/80">{icons[item.icon]}</span>
                              {!navCollapsed ? item.label : null}
                            </span>
                            {item.label === "Income" && !navCollapsed ? (
                              <span className="text-sand/60">
                                {incomeNavOpen ? icons.chevronDown : icons.chevron}
                              </span>
                            ) : null}
                          </span>
                          {!item.enabled && !navCollapsed ? (
                            <span className="mt-1 block text-xs text-sand/40">(coming soon!)</span>
                          ) : null}
                        </button>
                        {item.label === "Income" && incomeNavOpen ? (
                          <div className="absolute left-full top-0 z-50 ml-3 w-56 rounded-2xl border border-sand/10 bg-ink/95 p-3 text-sand shadow-xl">
                            <button
                              type="button"
                              className="w-full rounded-xl px-3 py-2 text-left text-sm text-sand/80 hover:bg-sand/10"
                              onClick={StartAddIncome}
                            >
                              <span className="flex items-center gap-2">
                                {icons.plus}
                                Add income stream
                              </span>
                            </button>
                            <button
                              type="button"
                              className="mt-2 w-full rounded-xl px-3 py-2 text-left text-sm text-sand/80 hover:bg-sand/10"
                              onClick={() => {
                                setActiveMenu("Calculator");
                                setIncomeNavOpen(false);
                              }}
                            >
                              <span className="flex items-center gap-2">
                                {icons.calculator}
                                Salary calculator
                              </span>
                            </button>
                            <button
                              type="button"
                              className="mt-2 w-full rounded-xl px-3 py-2 text-left text-sm text-sand/80 hover:bg-sand/10"
                              onClick={() => {
                                setActiveMenu("What-if");
                                setIncomeNavOpen(false);
                              }}
                            >
                              <span className="flex items-center gap-2">
                                {icons.allocations}
                                What-if analysis
                              </span>
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <button
                      type="button"
                      className="w-full rounded-2xl px-4 py-3 text-left text-sm text-sand/70"
                      onClick={() => {
                        setLayoutNavOpen((current) => !current);
                        setIncomeNavOpen(false);
                        setAccountNavOpen(false);
                      }}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-3">
                          <span className="text-sand/80">{icons.layout}</span>
                          {!navCollapsed ? "Layout" : null}
                        </span>
                        {!navCollapsed ? (
                          <span className="text-sand/60">
                            {layoutNavOpen ? icons.chevronDown : icons.chevron}
                          </span>
                        ) : null}
                      </span>
                    </button>
                    {layoutNavOpen && !navCollapsed ? (
                      <div className="absolute left-full top-0 z-50 ml-3 w-56 rounded-2xl border border-sand/10 bg-ink/95 p-3 text-sand shadow-xl">
                        {[
                          { value: "auto", label: "Auto layout" },
                          { value: "desktop", label: "Desktop layout" },
                          { value: "compact", label: "Compact layout" }
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
                              layoutMode === option.value ? "bg-sand/10 text-sand" : "text-sand/70"
                            }`}
                            onClick={() => setLayoutMode(option.value)}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      className="w-full rounded-2xl px-4 py-3 text-left text-sm text-sand/70"
                      onClick={() => {
                        setAccountNavOpen((current) => !current);
                        setIncomeNavOpen(false);
                        setLayoutNavOpen(false);
                      }}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-3">
                          <span className="text-sand/80">{icons.settings}</span>
                          {!navCollapsed ? "Account" : null}
                        </span>
                        {!navCollapsed ? (
                          <span className="text-sand/60">
                            {accountNavOpen ? icons.chevronDown : icons.chevron}
                          </span>
                        ) : null}
                      </span>
                    </button>
                    {accountNavOpen && !navCollapsed ? (
                      <div className="absolute left-full top-0 z-50 ml-3 w-56 rounded-2xl border border-sand/10 bg-ink/95 p-3 text-sand shadow-xl">
                        {accountOptions.map((option, index) => (
                          <button
                            key={option}
                            type="button"
                            className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
                              index === 0 ? "bg-sand/10 text-sand" : "opacity-70"
                            }`}
                            disabled={index !== 0}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="w-full rounded-2xl px-4 py-3 text-left text-sm text-sand/70"
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-sand/80">
                        {theme === "light" ? icons.moon : icons.sun}
                      </span>
                      {!navCollapsed ? (theme === "light" ? "Dark mode" : "Light mode") : null}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-2xl px-4 py-3 text-left text-sm text-sand/70"
                    onClick={() => setTokens(null)}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-sand/80">{icons.logout}</span>
                      {!navCollapsed ? "Sign out" : null}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-sand/20 px-4 py-3 text-left text-sm text-sand/70"
                    onClick={() => setNavCollapsed((current) => !current)}
                    aria-label={navCollapsed ? "Expand navigation" : "Collapse navigation"}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-sand/80">{icons.collapse}</span>
                      {!navCollapsed ? "Collapse" : null}
                    </span>
                  </button>
                </div>
              </aside>
            ) : null}

            <section className="flex min-w-0 flex-1 flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {isCompact ? (
                    <button
                      type="button"
                      className="rounded-full border border-ink/20 bg-white px-4 py-2 text-sm dark:border-sand/20 dark:bg-[#141311]"
                      onClick={() => setNavOpen(true)}
                    >
                      Menu
                    </button>
                  ) : null}
                  <div>
                    <h2 className="font-display text-2xl">{activeMenu}</h2>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3" />
              </div>

              {status.message ? (
                <div
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    status.type === "error"
                      ? "bg-ember/10 text-ember"
                      : "bg-moss/10 text-moss"
                  }`}
                >
                  {status.message}
                </div>
              ) : null}

              {scenarioEnabled ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">
                  <div>
                    Scenario mode active for {scenarioType.toUpperCase()} streams.
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-ember/30 px-3 py-1 text-xs"
                    onClick={() => {
                      setScenarioEnabled(false);
                      setActiveMenu("Income");
                    }}
                  >
                    Exit scenario
                  </button>
                </div>
              ) : null}

              {activeMenu === "Income" ? (
              <>
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
                            <tr key={`${stream.Id}-gross`} className="hover:bg-ink/5 dark:hover:bg-sand/10">
                              <td className="px-3 py-2 font-semibold">{stream.Label}</td>
                              <td className="px-3 py-2">
                                {DisplayForPeriod(stream, "daily", stream.GrossAmount, stream.GrossPerDay)}
                              </td>
                              <td className="px-3 py-2">
                                {DisplayForPeriod(stream, "weekly", stream.GrossAmount, stream.GrossPerWeek)}
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
                                {DisplayForPeriod(stream, "yearly", stream.GrossAmount, stream.GrossPerYear)}
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

              {showAddIncomeForm ? (
                <div
                  id="income-form"
                  className="rounded-3xl border border-ink/10 bg-white/90 p-4 shadow-glow backdrop-blur dark:border-sand/10 dark:bg-[#141311]/90"
                >
                  <h3 className="font-display text-xl">
                    {editingStreamId ? "Edit income stream" : "Add income stream"}
                  </h3>
                  <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={HandleIncomeSubmit}>
                    <label className="text-sm">
                      Label
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
                        <option>Quarterly</option>
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
                        disabled={loading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-moss px-4 py-3 text-sm font-semibold text-white"
                        disabled={loading}
                      >
                        {editingStreamId ? "Save changes" : "Save income stream"}
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}
              </>
              ) : null}

              {activeMenu === "Calculator" ? (
                <>
                  <div className="rounded-3xl border border-ink/10 bg-white/95 p-5 shadow-glow backdrop-blur dark:border-sand/10 dark:bg-[#141311]/95">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm uppercase tracking-[0.25em] text-ink/50 dark:text-sand/60">
                          Salary calculator
                        </p>
                        <h2 className="font-display text-2xl">Estimate net and gross pay</h2>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-ink/60 dark:text-sand/60">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={calculatorShowDecimals}
                            onChange={(event) => setCalculatorShowDecimals(event.target.checked)}
                          />
                          Show decimals
                        </label>
                        {calculatorResult?.IsEstimated ? (
                          <span className="rounded-full border border-ember/30 bg-ember/10 px-3 py-1 text-xs text-ember">
                            Rates estimated for {calculatorResult.TaxYear}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-ink/50 dark:text-sand/60">
                      Auto updates as you type.
                    </p>
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
                              <td className="px-3 py-2">
                                {FormatCurrencyWithDecimals(
                                  calculatorResult.Gross.Weekly,
                                  calculatorShowDecimals
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {FormatCurrencyWithDecimals(
                                  calculatorResult.Gross.Fortnightly,
                                  calculatorShowDecimals
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {FormatCurrencyWithDecimals(
                                  calculatorResult.Gross.Monthly,
                                  calculatorShowDecimals
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {FormatCurrencyWithDecimals(
                                  calculatorResult.Gross.Yearly,
                                  calculatorShowDecimals
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-semibold">Net pay</td>
                              <td className="px-3 py-2">
                                {FormatCurrencyWithDecimals(
                                  calculatorResult.Net.Weekly,
                                  calculatorShowDecimals
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {FormatCurrencyWithDecimals(
                                  calculatorResult.Net.Fortnightly,
                                  calculatorShowDecimals
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {FormatCurrencyWithDecimals(
                                  calculatorResult.Net.Monthly,
                                  calculatorShowDecimals
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {FormatCurrencyWithDecimals(
                                  calculatorResult.Net.Yearly,
                                  calculatorShowDecimals
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2">Income tax</td>
                              <td className="px-3 py-2">
                                {FormatCurrencyWithDecimals(
                                  calculatorResult.IncomeTax.Weekly,
                                  calculatorShowDecimals
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {FormatCurrencyWithDecimals(
                                  calculatorResult.IncomeTax.Fortnightly,
                                  calculatorShowDecimals
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {FormatCurrencyWithDecimals(
                                  calculatorResult.IncomeTax.Monthly,
                                  calculatorShowDecimals
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {FormatCurrencyWithDecimals(
                                  calculatorResult.IncomeTax.Yearly,
                                  calculatorShowDecimals
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2">Medicare levy</td>
                              <td className="px-3 py-2">
                                {FormatCurrencyWithDecimals(
                                  calculatorResult.Medicare.Weekly,
                                  calculatorShowDecimals
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {FormatCurrencyWithDecimals(
                                  calculatorResult.Medicare.Fortnightly,
                                  calculatorShowDecimals
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {FormatCurrencyWithDecimals(
                                  calculatorResult.Medicare.Monthly,
                                  calculatorShowDecimals
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {FormatCurrencyWithDecimals(
                                  calculatorResult.Medicare.Yearly,
                                  calculatorShowDecimals
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2">MLS</td>
                              <td className="px-3 py-2">
                                {FormatCurrencyWithDecimals(
                                  calculatorResult.Mls.Weekly,
                                  calculatorShowDecimals
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {FormatCurrencyWithDecimals(
                                  calculatorResult.Mls.Fortnightly,
                                  calculatorShowDecimals
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {FormatCurrencyWithDecimals(
                                  calculatorResult.Mls.Monthly,
                                  calculatorShowDecimals
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {FormatCurrencyWithDecimals(
                                  calculatorResult.Mls.Yearly,
                                  calculatorShowDecimals
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2">Superannuation</td>
                              <td className="px-3 py-2">
                                {FormatCurrencyWithDecimals(
                                  calculatorResult.Super.Weekly,
                                  calculatorShowDecimals
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {FormatCurrencyWithDecimals(
                                  calculatorResult.Super.Fortnightly,
                                  calculatorShowDecimals
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {FormatCurrencyWithDecimals(
                                  calculatorResult.Super.Monthly,
                                  calculatorShowDecimals
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {FormatCurrencyWithDecimals(
                                  calculatorResult.Super.Yearly,
                                  calculatorShowDecimals
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-4 rounded-2xl border border-ink/10 bg-ink/5 p-4 text-xs text-ink/70 dark:border-sand/10 dark:bg-sand/10 dark:text-sand/70">
                        <div className="font-semibold text-ink/70 dark:text-sand/70">
                          Annual details
                        </div>
                        <div className="mt-2 space-y-1">
                          <div>
                            Salary annualized:{" "}
                            {FormatCurrencyWithDecimals(
                              calculatorResult.SalaryAnnual,
                              calculatorShowDecimals
                            )}
                          </div>
                          <div>
                            Taxable income:{" "}
                            {FormatCurrencyWithDecimals(
                              calculatorResult.TaxableAnnual,
                              calculatorShowDecimals
                            )}
                          </div>
                          <div>
                            Novated lease:{" "}
                            {FormatCurrencyWithDecimals(
                              calculatorResult.NovatedLeaseAnnual,
                              calculatorShowDecimals
                            )}
                          </div>
                          <div>
                            Income tax:{" "}
                            {FormatCurrencyWithDecimals(
                              calculatorResult.IncomeTaxAnnual,
                              calculatorShowDecimals
                            )}
                          </div>
                          <div>
                            Medicare levy:{" "}
                            {FormatCurrencyWithDecimals(
                              calculatorResult.MedicareAnnual,
                              calculatorShowDecimals
                            )}
                          </div>
                          <div>
                            MLS:{" "}
                            {FormatCurrencyWithDecimals(
                              calculatorResult.MlsAnnual,
                              calculatorShowDecimals
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-3xl border border-ink/10 bg-white/95 p-5 shadow-glow backdrop-blur dark:border-sand/10 dark:bg-[#141311]/95">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60 dark:text-sand/60">
                          Inputs
                        </div>
                        <div className="text-sm text-ink/70 dark:text-sand/70">
                          Adjust salary and options
                        </div>
                      </div>
                    </div>

                    <form
                      className="mt-4 grid gap-4 md:grid-cols-2"
                      onSubmit={HandleCalculatorSubmit}
                    >
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
                        <div className="md:col-span-2 grid gap-3 md:grid-cols-3">
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
                          {calculatorForm.SalaryFrequency === "Hourly" ? (
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
                          ) : null}
                          {calculatorForm.SalaryFrequency === "Daily" ? (
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
                          ) : (
                            <div className="hidden md:block" />
                          )}
                        </div>
                        <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
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
                            Novated lease frequency
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
                        <div className="md:col-span-2 grid gap-3 md:grid-cols-3">
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
                          <label className="flex items-center gap-2 text-sm">
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
                          <label className="flex items-center gap-2 text-sm">
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
                        <div className="flex items-center gap-3 md:col-span-2">
                          <button
                            type="submit"
                            className="rounded-xl border border-ink/20 px-4 py-3 text-sm dark:border-sand/30"
                            disabled={calculatorLoading}
                          >
                            {calculatorLoading ? "Updating" : "Refresh"}
                          </button>
                          <span className="text-xs text-ink/50 dark:text-sand/60">
                            Estimates assume resident rates, tax-free threshold, no HELP or offsets.
                          </span>
                        </div>
                    </form>
                  </div>

                  {calculatorApplyOpen ? (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                      <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setCalculatorApplyOpen(false)}
                      />
                      <div className="relative w-full max-w-lg rounded-3xl border border-ink/10 bg-white p-5 shadow-glow dark:border-sand/10 dark:bg-[#141311]">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60 dark:text-sand/60">
                              Use as income stream
                            </div>
                            <div className="text-sm text-ink/70 dark:text-sand/70">
                              Apply calculator results
                            </div>
                          </div>
                          <button
                            type="button"
                            className="rounded-full border border-ink/20 px-3 py-1 text-xs dark:border-sand/30"
                            onClick={() => setCalculatorApplyOpen(false)}
                          >
                            Close
                          </button>
                        </div>
                        <div className="mt-4 grid gap-3 text-xs">
                          <label>
                            Apply as
                            <select
                              value={calculatorApplyMode}
                              onChange={(event) => setCalculatorApplyMode(event.target.value)}
                              className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-xs dark:border-sand/20 dark:bg-[#0f0e0c]"
                            >
                              <option value="create">Create new income stream</option>
                              <option value="update">Update existing income stream</option>
                            </select>
                          </label>
                          {calculatorApplyMode === "update" ? (
                            <label>
                              Choose stream
                              <select
                                value={calculatorTargetStream}
                                onChange={(event) => setCalculatorTargetStream(event.target.value)}
                                className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-xs dark:border-sand/20 dark:bg-[#0f0e0c]"
                              >
                                <option value="">Select income stream</option>
                                {incomeStreams.map((stream) => (
                                  <option key={stream.Id} value={stream.Id}>
                                    {stream.Label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : null}
                          <label>
                            Income stream frequency
                            <select
                              value={calculatorForm.IncomeFrequency}
                              onChange={(event) =>
                                setCalculatorForm((prev) => ({
                                  ...prev,
                                  IncomeFrequency: event.target.value
                                }))
                              }
                              className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-xs dark:border-sand/20 dark:bg-[#0f0e0c]"
                            >
                              <option>Daily</option>
                              <option>Weekly</option>
                              <option>Fortnightly</option>
                              <option>Monthly</option>
                              <option>Yearly</option>
                            </select>
                          </label>
                          <label>
                            Effective date
                            <input
                              type="date"
                              value={calculatorEffectiveDate}
                              onChange={(event) => setCalculatorEffectiveDate(event.target.value)}
                              className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-xs dark:border-sand/20 dark:bg-[#0f0e0c]"
                            />
                          </label>
                          <button
                            type="button"
                            className="rounded-xl bg-ember px-3 py-2 text-xs font-semibold text-white"
                            onClick={ApplyCalculatorToIncome}
                          >
                            Apply calculation
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}

              {activeMenu === "What-if" ? (
                <div className="rounded-3xl border border-ink/10 bg-white/95 p-4 shadow-glow backdrop-blur dark:border-sand/10 dark:bg-[#141311]/95">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.25em] text-ink/50 dark:text-sand/60">
                        Scenario tool
                      </p>
                      <h2 className="font-display text-2xl">What-if analysis</h2>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-ink/60 dark:text-sand/60">
                      <input
                        type="checkbox"
                        checked={scenarioEnabled}
                        onChange={(event) => setScenarioEnabled(event.target.checked)}
                      />
                      Enable scenario mode
                    </label>
                  </div>

                  <div className="mt-4 rounded-2xl border border-ink/10 p-4 dark:border-sand/10">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/60 dark:text-sand/60">
                        Scenario adjustments
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="scenarioType"
                            checked={scenarioType === "net"}
                            onChange={() => setScenarioType("net")}
                          />
                          Net
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="scenarioType"
                            checked={scenarioType === "gross"}
                            onChange={() => setScenarioType("gross")}
                          />
                          Gross
                        </label>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-2xl border border-ink/10 p-3 text-xs dark:border-sand/10">
                        <div className="font-semibold uppercase tracking-[0.2em] text-ink/60 dark:text-sand/60">
                          Save scenario
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            placeholder="Scenario name"
                            value={scenarioName}
                            onChange={(event) => setScenarioName(event.target.value)}
                            className="flex-1 rounded-lg border border-ink/15 bg-white px-2 py-1 text-xs dark:border-sand/20 dark:bg-[#0f0e0c]"
                          />
                          <button
                            type="button"
                            className="rounded-full border border-ink/20 px-3 py-1 text-xs dark:border-sand/30"
                            onClick={SaveScenario}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-ink/10 p-3 text-xs dark:border-sand/10">
                        <div className="font-semibold uppercase tracking-[0.2em] text-ink/60 dark:text-sand/60">
                          Load scenario
                        </div>
                        <div className="relative mt-2">
                          <input
                            type="text"
                            placeholder="Search scenarios"
                            value={scenarioSearch}
                            onChange={(event) => {
                              setScenarioSearch(event.target.value);
                              setScenarioDropdownOpen(true);
                            }}
                            onFocus={() => setScenarioDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setScenarioDropdownOpen(false), 100)}
                            className="w-full rounded-lg border border-ink/15 bg-white px-2 py-1 text-xs dark:border-sand/20 dark:bg-[#0f0e0c]"
                          />
                          {scenarioDropdownOpen ? (
                            <div className="absolute z-20 mt-2 w-full rounded-xl border border-ink/10 bg-white p-2 shadow-glow dark:border-sand/10 dark:bg-[#141311]">
                              {filteredScenarios.length === 0 ? (
                                <div className="px-2 py-2 text-xs text-ink/60 dark:text-sand/60">
                                  No scenarios found.
                                </div>
                              ) : (
                                <div className="max-h-44 space-y-1 overflow-auto">
                                  {filteredScenarios.map((scenario) => (
                                    <div
                                      key={scenario.Id}
                                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 hover:bg-ink/5 dark:hover:bg-sand/10"
                                    >
                                      <button
                                        type="button"
                                        className="text-left text-xs font-semibold"
                                        onClick={() => {
                                          LoadScenario(scenario);
                                          setScenarioSearch("");
                                          setScenarioDropdownOpen(false);
                                        }}
                                      >
                                        {scenario.Name}
                                      </button>
                                      <button
                                        type="button"
                                        className="rounded-full border border-ink/20 px-2 py-1 text-[10px] dark:border-sand/30"
                                        onClick={() => DeleteScenarioLocal(scenario.Id)}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 overflow-auto">
                      <table className="min-w-[760px] w-full table-fixed text-left text-xs">
                        <colgroup>
                          <col className="w-[26%]" />
                          <col className="w-[18%]" />
                          <col className="w-[18%]" />
                          <col className="w-[18%]" />
                          <col className="w-[20%]" />
                        </colgroup>
                        <thead className="bg-ink/5 text-ink/70 dark:bg-sand/10 dark:text-sand/70">
                          <tr>
                            <th className="px-3 py-2">Stream</th>
                            <th className="px-3 py-2">Current</th>
                            <th className="px-3 py-2">New amount</th>
                            <th className="px-3 py-2">Frequency</th>
                            <th className="px-3 py-2">Apply</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ink/10 dark:divide-sand/10">
                          {incomeStreams.map((stream) => {
                            const checked = scenarioSelectedIds.includes(stream.Id);
                            const adjustment = scenarioAdjustments[stream.Id] || {
                              Amount: "",
                              Frequency: stream.Frequency
                            };
                            const rowFrequency = adjustment.Frequency || stream.Frequency;
                            const currentAmount = GetPeriodValue(
                              stream,
                              scenarioType === "net",
                              rowFrequency
                            );
                            return (
                              <tr key={`scenario-${stream.Id}`}>
                                <td className="px-3 py-2 font-semibold">{stream.Label}</td>
                                <td className="px-3 py-2">{FormatCurrency(currentAmount)}</td>
                                <td className="px-3 py-2">
                                  <div className="relative">
                                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-ink/50 dark:text-sand/60">
                                      $
                                    </span>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      placeholder="0.00"
                                      value={FormatAmountInput(adjustment.Amount)}
                                      onChange={(event) => {
                                        if (!scenarioSelectedIds.includes(stream.Id)) {
                                          setScenarioSelectedIds((current) => [...current, stream.Id]);
                                        }
                                        const normalized = NormalizeAmountInput(event.target.value);
                                        setScenarioAdjustments((current) => ({
                                          ...current,
                                          [stream.Id]: {
                                            ...adjustment,
                                            Amount: normalized
                                          }
                                        }));
                                      }}
                                      className="w-full rounded-lg border border-ink/15 bg-white py-1 pl-5 pr-2 text-xs dark:border-sand/20 dark:bg-[#0f0e0c]"
                                    />
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <select
                                    value={rowFrequency}
                                    onChange={(event) => {
                                      setScenarioAdjustments((current) => ({
                                        ...current,
                                        [stream.Id]: {
                                          ...adjustment,
                                          Frequency: event.target.value
                                        }
                                      }));
                                    }}
                                    className="w-full rounded-lg border border-ink/15 bg-white px-2 py-1 text-xs dark:border-sand/20 dark:bg-[#0f0e0c]"
                                  >
                                    <option>Daily</option>
                                    <option>Weekly</option>
                                    <option>Fortnightly</option>
                                    <option>Monthly</option>
                                    <option>Quarterly</option>
                                    <option>Yearly</option>
                                  </select>
                                </td>
                                <td className="px-3 py-2">
                                  <label className="flex items-center gap-2 text-xs">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {
                                        setScenarioSelectedIds((current) =>
                                          checked
                                            ? current.filter((id) => id !== stream.Id)
                                            : [...current, stream.Id]
                                        );
                                        if (!checked && !scenarioAdjustments[stream.Id]) {
                                          setScenarioAdjustments((current) => ({
                                            ...current,
                                            [stream.Id]: {
                                              Amount: "",
                                              Frequency: stream.Frequency
                                            }
                                          }));
                                        }
                                      }}
                                    />
                                    Include
                                  </label>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2 text-xs text-ink/60 dark:text-sand/60">
                      Enter new amounts per stream. Scenario totals show the combined difference.
                    </p>
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

            </section>

            {isCompact ? (
              <div
                className={`fixed inset-0 z-40 transition ${
                  navOpen ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <div
                  className="absolute inset-0 bg-black/40"
                  onClick={() => setNavOpen(false)}
                />
                <aside className="relative h-full w-72 bg-ink px-6 py-6 text-sand shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-sand/60">
                      <span className="inline-flex h-5 w-5 items-center justify-center text-sand/80">
                        {icons.household}
                      </span>
                      Household
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-sand/30 px-2 py-1 text-xs"
                      onClick={() => setNavOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                  <div className="mt-6 space-y-3">
                    {navItems.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        className={`w-full rounded-2xl px-4 py-3 text-left text-sm ${
                          item.label === activeMenu
                            ? "bg-sand/10 text-sand"
                            : "text-sand/60"
                        } ${item.enabled ? "" : "cursor-not-allowed opacity-60"}`}
                        disabled={!item.enabled}
                        onClick={() => {
                          if (!item.enabled) {
                            return;
                          }
                          setActiveMenu(item.label);
                          if (item.label === "Income") {
                            setIncomeNavOpen((current) => !current);
                          } else {
                            setIncomeNavOpen(false);
                          }
                          setNavOpen(false);
                        }}
                      >
                        <span className="flex items-center justify-between">
                          <span className="flex items-center gap-3">
                            <span className="text-sand/80">{icons[item.icon]}</span>
                            {item.label}
                          </span>
                          {item.label === "Income" ? (
                            <span className="text-sand/60">
                              {incomeNavOpen ? icons.chevronDown : icons.chevron}
                            </span>
                          ) : null}
                        </span>
                        {!item.enabled ? (
                          <span className="mt-1 block text-xs text-sand/40">(coming soon!)</span>
                        ) : null}
                      </button>
                    ))}
                    {incomeNavOpen ? (
                      <div className="space-y-2">
                        <button
                          type="button"
                          className="w-full rounded-2xl border border-sand/10 px-4 py-2 text-left text-xs text-sand/70"
                          onClick={() => {
                            StartAddIncome();
                            setNavOpen(false);
                          }}
                        >
                          <span className="flex items-center gap-2">
                            {icons.plus}
                            Add income stream
                          </span>
                        </button>
                        <button
                          type="button"
                          className="w-full rounded-2xl border border-sand/10 px-4 py-2 text-left text-xs text-sand/70"
                          onClick={() => {
                            setActiveMenu("Calculator");
                            setIncomeNavOpen(false);
                            setNavOpen(false);
                          }}
                        >
                          <span className="flex items-center gap-2">
                            {icons.calculator}
                            Salary calculator
                          </span>
                        </button>
                        <button
                          type="button"
                          className="w-full rounded-2xl border border-sand/10 px-4 py-2 text-left text-xs text-sand/70"
                          onClick={() => {
                            setActiveMenu("What-if");
                            setIncomeNavOpen(false);
                            setNavOpen(false);
                          }}
                        >
                          <span className="flex items-center gap-2">
                            {icons.allocations}
                            What-if analysis
                          </span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-auto space-y-3 pt-10">
                    <button
                      type="button"
                      className="w-full rounded-2xl px-4 py-3 text-left text-sm text-sand/70"
                      onClick={() => setLayoutNavOpen((current) => !current)}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-3">
                          <span className="text-sand/80">{icons.layout}</span>
                          Layout
                        </span>
                        <span className="text-sand/60">
                          {layoutNavOpen ? icons.chevronDown : icons.chevron}
                        </span>
                      </span>
                    </button>
                    {layoutNavOpen ? (
                      <div className="space-y-2 rounded-2xl border border-sand/10 px-3 py-3 text-xs text-sand/70">
                        {[
                          { value: "auto", label: "Auto layout" },
                          { value: "desktop", label: "Desktop layout" },
                          { value: "compact", label: "Compact layout" }
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={`w-full rounded-xl px-3 py-2 text-left ${
                              layoutMode === option.value ? "bg-sand/10 text-sand" : ""
                            }`}
                            onClick={() => setLayoutMode(option.value)}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      className="w-full rounded-2xl px-4 py-3 text-left text-sm text-sand/70"
                      onClick={() => setAccountNavOpen((current) => !current)}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-3">
                          <span className="text-sand/80">{icons.settings}</span>
                          Account
                        </span>
                        <span className="text-sand/60">
                          {accountNavOpen ? icons.chevronDown : icons.chevron}
                        </span>
                      </span>
                    </button>
                    {accountNavOpen ? (
                      <div className="space-y-2 rounded-2xl border border-sand/10 px-3 py-3 text-xs text-sand/70">
                        {accountOptions.map((option, index) => (
                          <button
                            key={option}
                            type="button"
                            className={`w-full rounded-xl px-3 py-2 text-left ${
                              index === 0 ? "bg-sand/10 text-sand" : "opacity-70"
                            }`}
                            disabled={index !== 0}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      className="w-full rounded-2xl px-4 py-3 text-left text-sm text-sand/70"
                      onClick={() => {
                        setTheme(theme === "light" ? "dark" : "light");
                        setNavOpen(false);
                      }}
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-sand/80">
                          {theme === "light" ? icons.moon : icons.sun}
                        </span>
                        {theme === "light" ? "Dark mode" : "Light mode"}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-2xl px-4 py-3 text-left text-sm text-sand/70"
                      onClick={() => {
                        setTokens(null);
                        setNavOpen(false);
                      }}
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-sand/80">{icons.logout}</span>
                        Sign out
                      </span>
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-2xl border border-sand/20 px-4 py-3 text-left text-sm text-sand/70"
                      onClick={() => {
                        setNavCollapsed((current) => !current);
                        setNavOpen(false);
                      }}
                    >
                      <span className="flex items-center gap-3">
                        {icons.collapse}
                        {navCollapsed ? "Expand navigation" : "Collapse navigation"}
                      </span>
                    </button>
                  </div>
                </aside>
              </div>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
