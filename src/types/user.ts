export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
