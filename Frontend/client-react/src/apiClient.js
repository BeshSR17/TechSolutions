// src/apiClient.js
import { supabase } from './supabaseClient';

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:5000/api';

export const apiClient = async (endpoint, options = {}) => {
  const session = (await supabase.auth.getSession()).data.session;
  const token = session?.access_token;

  if (!token) {
    console.warn("No hay sesión activa");
    return { ok: false, status: 401, json: () => Promise.resolve({ error: "No hay token" }) };
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  try {
    const response = await fetch(`${BASE_URL}${cleanEndpoint}`, {
      ...options,
      headers,
    });
    return response;
  } catch (error) {
    console.error("Error en la comunicación:", error);
    throw error;
  }
};