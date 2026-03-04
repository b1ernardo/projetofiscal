
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost/SISTEMADISTRIDUIDORA/api';

interface RequestOptions extends RequestInit {
  body?: any;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  
  const headers = {
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...options.headers,
  };

  const config: RequestInit = {
    ...options,
    headers: headers as HeadersInit,
    credentials: 'include', // Important for cookies/sessions
    body: isFormData ? options.body : JSON.stringify(options.body),
  };

  if (options.method === 'GET') {
    delete config.body;
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
  }

  // Handle empty responses (like 204 No Content)
  if (response.status === 204) {
      return {} as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body: any, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'POST', body }),
  put: <T>(endpoint: string, body: any, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'PUT', body }),
  delete: <T>(endpoint: string, options?: RequestOptions) => request<T>(endpoint, { ...options, method: 'DELETE' }),
};
