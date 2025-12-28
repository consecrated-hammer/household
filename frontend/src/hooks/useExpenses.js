import { useCallback, useEffect, useRef, useState } from "react";
import {
  CreateExpense,
  CreateExpenseAccount,
  CreateExpenseType,
  DeleteExpense,
  DeleteExpenseAccount,
  DeleteExpenseType,
  GetTablePreference,
  ListExpenseAccounts,
  ListExpenseTypes,
  ListExpenses,
  UpdateExpense,
  UpdateExpenseAccount,
  UpdateExpenseOrder,
  UpdateExpenseType,
  UpsertTablePreference
} from "../lib/api.js";
import {
  DefaultExpenseTableState,
  NormalizeExpenseTableState
} from "../lib/expenseTable.js";
import { useAuth } from "../contexts/AuthContext.jsx";

export function useExpenses({ tableKey }) {
  const { tokens, ExecuteWithRefresh } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expenseTableState, setExpenseTableState] = useState(DefaultExpenseTableState);
  const [expenseTableLoaded, setExpenseTableLoaded] = useState(false);
  const tableSaveRef = useRef(null);

  const refreshExpenses = useCallback(async () => {
    if (!tokens?.AccessToken) {
      setExpenses([]);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const data = await ExecuteWithRefresh((accessToken) => ListExpenses(accessToken));
      setExpenses(data);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [ExecuteWithRefresh, tokens?.AccessToken]);

  const refreshAccounts = useCallback(async () => {
    if (!tokens?.AccessToken) {
      setExpenseAccounts([]);
      return [];
    }
    try {
      const data = await ExecuteWithRefresh((accessToken) =>
        ListExpenseAccounts(accessToken)
      );
      setExpenseAccounts(data);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [ExecuteWithRefresh, tokens?.AccessToken]);

  const refreshTypes = useCallback(async () => {
    if (!tokens?.AccessToken) {
      setExpenseTypes([]);
      return [];
    }
    try {
      const data = await ExecuteWithRefresh((accessToken) => ListExpenseTypes(accessToken));
      setExpenseTypes(data);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [ExecuteWithRefresh, tokens?.AccessToken]);

  useEffect(() => {
    if (!tokens?.AccessToken) {
      setExpenses([]);
      return;
    }
    refreshExpenses().catch(() => {});
  }, [tokens?.AccessToken, refreshExpenses]);

  useEffect(() => {
    if (!tokens?.AccessToken) {
      setExpenseAccounts([]);
      setExpenseTypes([]);
      return;
    }
    refreshAccounts().catch(() => {});
    refreshTypes().catch(() => {});
  }, [tokens?.AccessToken, refreshAccounts, refreshTypes]);

  useEffect(() => {
    if (!tokens?.AccessToken || !tableKey) {
      return;
    }
    setExpenseTableLoaded(false);
    ExecuteWithRefresh((accessToken) => GetTablePreference(accessToken, tableKey))
      .then((pref) => {
        setExpenseTableState(NormalizeExpenseTableState(pref.State));
        setExpenseTableLoaded(true);
      })
      .catch((err) => {
        if (err.status === 404) {
          setExpenseTableState(DefaultExpenseTableState);
          setExpenseTableLoaded(true);
          return;
        }
        setError(err);
      });
  }, [ExecuteWithRefresh, tokens?.AccessToken, tableKey]);

  useEffect(() => {
    if (!tokens?.AccessToken || !tableKey || !expenseTableLoaded) {
      return;
    }
    if (tableSaveRef.current) {
      clearTimeout(tableSaveRef.current);
    }
    tableSaveRef.current = setTimeout(() => {
      ExecuteWithRefresh((accessToken) =>
        UpsertTablePreference(accessToken, tableKey, {
          TableKey: tableKey,
          State: expenseTableState
        })
      ).catch((err) => {
        setError(err);
      });
    }, 600);
    return () => clearTimeout(tableSaveRef.current);
  }, [ExecuteWithRefresh, tokens?.AccessToken, tableKey, expenseTableLoaded, expenseTableState]);

  const createExpense = useCallback(
    async (payload) => {
      const created = await ExecuteWithRefresh((accessToken) =>
        CreateExpense(accessToken, payload)
      );
      setExpenses((current) => [created, ...current]);
      return created;
    },
    [ExecuteWithRefresh]
  );

  const updateExpense = useCallback(
    async (expenseId, payload) => {
      const updated = await ExecuteWithRefresh((accessToken) =>
        UpdateExpense(accessToken, expenseId, payload)
      );
      setExpenses((current) =>
        current.map((item) => (item.Id === expenseId ? updated : item))
      );
      return updated;
    },
    [ExecuteWithRefresh]
  );

  const deleteExpense = useCallback(
    async (expenseId) => {
      await ExecuteWithRefresh((accessToken) => DeleteExpense(accessToken, expenseId));
      setExpenses((current) => current.filter((item) => item.Id !== expenseId));
    },
    [ExecuteWithRefresh]
  );

  const updateExpenseOrder = useCallback(
    async (payload) => {
      await ExecuteWithRefresh((accessToken) => UpdateExpenseOrder(accessToken, payload));
      setExpenses((current) =>
        current.map((expense) => {
          const entry = payload.find((item) => item.ExpenseId === expense.Id);
          if (!entry) {
            return expense;
          }
          return { ...expense, DisplayOrder: entry.DisplayOrder };
        })
      );
    },
    [ExecuteWithRefresh]
  );

  const createExpenseAccount = useCallback(
    async (payload) => {
      const created = await ExecuteWithRefresh((accessToken) =>
        CreateExpenseAccount(accessToken, payload)
      );
      setExpenseAccounts((current) => [...current, created]);
      return created;
    },
    [ExecuteWithRefresh]
  );

  const updateExpenseAccount = useCallback(
    async (accountId, payload) => {
      const updated = await ExecuteWithRefresh((accessToken) =>
        UpdateExpenseAccount(accessToken, accountId, payload)
      );
      setExpenseAccounts((current) =>
        current.map((account) => (account.Id === accountId ? updated : account))
      );
      return updated;
    },
    [ExecuteWithRefresh]
  );

  const deleteExpenseAccount = useCallback(
    async (accountId) => {
      await ExecuteWithRefresh((accessToken) => DeleteExpenseAccount(accessToken, accountId));
      setExpenseAccounts((current) => current.filter((account) => account.Id !== accountId));
    },
    [ExecuteWithRefresh]
  );

  const createExpenseType = useCallback(
    async (payload) => {
      const created = await ExecuteWithRefresh((accessToken) =>
        CreateExpenseType(accessToken, payload)
      );
      setExpenseTypes((current) => [...current, created]);
      return created;
    },
    [ExecuteWithRefresh]
  );

  const updateExpenseType = useCallback(
    async (typeId, payload) => {
      const updated = await ExecuteWithRefresh((accessToken) =>
        UpdateExpenseType(accessToken, typeId, payload)
      );
      setExpenseTypes((current) =>
        current.map((entry) => (entry.Id === typeId ? updated : entry))
      );
      return updated;
    },
    [ExecuteWithRefresh]
  );

  const deleteExpenseType = useCallback(
    async (typeId) => {
      await ExecuteWithRefresh((accessToken) => DeleteExpenseType(accessToken, typeId));
      setExpenseTypes((current) => current.filter((entry) => entry.Id !== typeId));
    },
    [ExecuteWithRefresh]
  );

  return {
    expenses,
    setExpenses,
    expenseAccounts,
    setExpenseAccounts,
    expenseTypes,
    setExpenseTypes,
    loading,
    error,
    refreshExpenses,
    refreshAccounts,
    refreshTypes,
    createExpense,
    updateExpense,
    deleteExpense,
    updateExpenseOrder,
    createExpenseAccount,
    updateExpenseAccount,
    deleteExpenseAccount,
    createExpenseType,
    updateExpenseType,
    deleteExpenseType,
    expenseTableState,
    setExpenseTableState,
    expenseTableLoaded
  };
}
