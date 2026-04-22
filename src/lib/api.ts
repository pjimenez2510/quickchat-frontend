const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3002';

interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      // Skip ngrok's browser warning interstitial page (free tier)
      'ngrok-skip-browser-warning': 'true',
    };

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<ApiResponse<T>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await res.json();

    if (!res.ok) {
      const error = json as ApiError;
      throw new Error(error.message || 'An error occurred');
    }

    return json as ApiResponse<T>;
  }

  get<T>(path: string) {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>('POST', path, body);
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>('PATCH', path, body);
  }

  delete<T>(path: string) {
    return this.request<T>('DELETE', path);
  }
}

export const api = new ApiClient(API_URL);
