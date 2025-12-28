import { useCallback, useEffect, useRef, useState } from "react";
import { CreateIncomeStream, ListIncomeStreams, UpdateIncomeStream } from "../lib/api.js";
import { useAuth } from "../contexts/AuthContext.jsx";

export function useIncomeStreams() {
  const { tokens, ExecuteWithRefresh } = useAuth();
  const [incomeStreams, setIncomeStreams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastFetchTokenRef = useRef(null);

  const refreshIncomeStreams = useCallback(async () => {
    if (!tokens?.AccessToken) {
      setIncomeStreams([]);
      lastFetchTokenRef.current = null;
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const data = await ExecuteWithRefresh((accessToken) =>
        ListIncomeStreams(accessToken)
      );
      setIncomeStreams(data);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [ExecuteWithRefresh, tokens?.AccessToken]);

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
    refreshIncomeStreams().catch(() => {});
  }, [tokens, refreshIncomeStreams]);

  const createIncomeStream = useCallback(
    async (payload) => {
      const created = await ExecuteWithRefresh((accessToken) =>
        CreateIncomeStream(accessToken, payload)
      );
      setIncomeStreams((current) => [created, ...current]);
      return created;
    },
    [ExecuteWithRefresh]
  );

  const updateIncomeStream = useCallback(
    async (streamId, payload) => {
      const updated = await ExecuteWithRefresh((accessToken) =>
        UpdateIncomeStream(accessToken, streamId, payload)
      );
      setIncomeStreams((current) =>
        current.map((stream) => (stream.Id === updated.Id ? updated : stream))
      );
      return updated;
    },
    [ExecuteWithRefresh]
  );

  return {
    incomeStreams,
    setIncomeStreams,
    loading,
    error,
    refreshIncomeStreams,
    createIncomeStream,
    updateIncomeStream
  };
}
