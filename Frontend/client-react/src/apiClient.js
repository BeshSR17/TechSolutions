// src/apiClient.js
import { supabase } from './supabaseClient';

const BASE_URL = 'http://localhost:5000/api';

export const apiClient = async (endpoint, options = {}) => {
  // 1. Intentamos obtener la sesión de forma síncrona primero (más rápido)
  const session = (await supabase.auth.getSession()).data.session;
  const token = session?.access_token;

  if (!token) {
    console.warn("No hay sesión activa");
    // Si no hay token, ni siquiera disparamos la petición para no saturar
    return { ok: false, status: 401, json: () => Promise.resolve({ error: "No hay token" }) };
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`, // El token ya es seguro aquí
    ...options.headers,
  };

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  try {
    const response = await fetch(`${BASE_URL}${cleanEndpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
    
    }

    return response;
  } catch (error) {
    console.error("Error en la comunicación:", error);
    throw error;
  }
};