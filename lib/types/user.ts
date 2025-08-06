import type { Document } from 'mongoose';

export interface IUser {
  id?: string;
  _id?: string;
  email: string;
  password: string;
  name?: string;
  role: "admin" | "user";
  comparePassword?(candidatePassword: string): Promise<boolean>;
}

export interface UserDTO {
  id: string;
  email: string;
  name?: string;
  role: "admin" | "user";
}
