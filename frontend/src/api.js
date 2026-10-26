const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const getToken = () => sessionStorage.getItem('coffee_shop_token');
export const setToken = token => sessionStorage.setItem('coffee_shop_token', token);
export const clearToken = () => sessionStorage.removeItem('coffee_shop_token');
export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) clearToken();
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}
