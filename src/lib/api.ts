import {
  qcipherEncrypt,
  qcipherDecrypt,
  isEncryptedPayload,
} from './crypto/qcipher';

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
      // Guardar contra valores corruptos: literal "undefined"/"null"
      if (token && token !== 'undefined' && token !== 'null') {
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
    // Cifrar body si existe
    const encryptedBody =
      body !== undefined ? qcipherEncrypt(JSON.stringify(body)) : undefined;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: this.getHeaders(),
      body: encryptedBody ? JSON.stringify(encryptedBody) : undefined,
    });

    const raw = (await res.json()) as unknown;

    // El backend siempre cifra la respuesta: { v:1, iv, ct }
    let parsed: unknown = raw;
    if (isEncryptedPayload(raw)) {
      try {
        parsed = JSON.parse(qcipherDecrypt(raw));
      } catch {
        throw new Error('Failed to decrypt server response');
      }
    }

    if (!res.ok) {
      const error = parsed as ApiError;
      throw new Error(error?.message || 'An error occurred');
    }

    return parsed as ApiResponse<T>;
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
