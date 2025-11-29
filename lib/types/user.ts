export interface IUser {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  timezone: string | null;
  createdAt: string;   // ISO string
  updatedAt: string;   // ISO string
  memberships: any[];  // You can define later if needed
}
