export type Role = "USER" | "UNCONFIRMED";

export interface Token {
    // in frontend replace number by string !!!
    id: number; // Id
    confirmation_code: string; // 6 digit confirmation code
    user_id: number;
    expires_at: Date; // otp expiry date (datetime)
}

export interface User {
    id: number; // Id
    name: string; // user name
    email: string; // email address
    password: string; // hashed password
    role: Role; // user role
    profile_picture: string; // profile picture url
}

export interface UpdateUserRequest {
    name: string;
    profile_picture: string;
}

export interface AuthenticatedUser {
    id: number;
    email: string;
}

export interface UserSession {
    user_id: number;
    refresh_token: string;
    expires_at: Date;
}