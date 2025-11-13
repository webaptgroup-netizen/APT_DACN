export type UserRole = 'Khach' | 'Cu dan' | 'Ban quan ly';

export interface AuthTokenPayload {
  id: number;
  email: string;
  role: UserRole;
}
