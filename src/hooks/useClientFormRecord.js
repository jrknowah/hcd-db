// Load and save a form that keeps one record per client (Exit Form, Discharge Plan).
// The backend is services/clientFormRecord.js: GET/PUT `${API}${endpoint}/:clientID`.
import { useState, useEffect, useCallback, useRef } from 'react';
import { getApiAuthHeaders } from '../utils/apiAuth';
import { toDateInputValue } from '../utils/dateOnly';

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const errorMessage = async (response, fallback) => {
  try {
    const body = await response.json();
    return body.message || body.error || fallback;
  } catch {
    return fallback;
  }
};

// Saved record -> form values: nulls become '' and DATE columns become YYYY-MM-DD
const toForm = (emptyForm, record) => {
  const form = { ...emptyForm };
  for (const key of Object.keys(emptyForm)) {
    const value = record?.[key];
    if (value == null) continue;
    if (Array.isArray(emptyForm[key])) form[key] = Array.isArray(value) ? value : [];
    else if (key.endsWith('Date')) form[key] = toDateInputValue(value);
    else form[key] = String(value);
  }
  return form;
};

export function useClientFormRecord(endpoint, clientID, emptyForm, { mock = false } = {}) {
  const emptyRef = useRef(emptyForm);
  const clientRef = useRef(clientID);
  clientRef.current = clientID;
  const [form, setForm] = useState(emptyForm);
  const [saved, setSaved] = useState(null); // { createdBy, createdAt, updatedBy, updatedAt } of the saved record
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loadedFor, setLoadedFor] = useState(null); // client whose saved form (or lack of one) has loaded

  useEffect(() => {
    // Never show the previous client's form while the new one loads
    setForm(emptyRef.current);
    setSaved(null);
    setError(null);
    setSuccess(null);
    setLoadedFor(null);
    if (!clientID) return undefined;
    if (mock) {
      setLoadedFor(clientID);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}/${encodeURIComponent(clientID)}`, {
          headers: await getApiAuthHeaders(),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(await errorMessage(response, 'Failed to load the form'));
        const { record } = await response.json();
        setForm(toForm(emptyRef.current, record));
        setSaved(record);
        setLoadedFor(clientID);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [endpoint, clientID, mock]);

  const setField = useCallback((name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
    setSuccess(null);
  }, []);

  const save = useCallback(async (values = form) => {
    if (!clientID) {
      setError('Please select a client first.');
      return false;
    }
    if (mock) {
      setError('Saving is turned off while using mock data.');
      return false;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}/${encodeURIComponent(clientID)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(await getApiAuthHeaders()) },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error(await errorMessage(response, 'Failed to save the form'));
      const { record } = await response.json();
      // The user switched clients while this was saving: don't show it on the new one
      if (clientRef.current !== clientID) return true;
      setForm(toForm(emptyRef.current, record));
      setSaved(record);
      setSuccess('Saved');
      return true;
    } catch (err) {
      if (clientRef.current === clientID) setError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [endpoint, clientID, mock, form]);

  const loaded = Boolean(clientID) && loadedFor === clientID;
  return { form, setField, saved, loaded, loading, saving, error, setError, success, save };
}
