export interface UserConfirmationRequest  {
    email: string;
    code: string;
}

export interface SendConfirmationCodeRequest  {
    email: string;
}

export interface UserRegisterRequest  {
    name: string;
    email: string;
    password: string;
    confirm_password: string;
}

export interface UserLoginRequest {
    email: string;
    password: string;
}

export interface PasswordUpdateRequest {
    email: string;
    old_password: string;
    new_password: string;
    confirm_new_password: string;
}