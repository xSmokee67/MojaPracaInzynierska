export interface LoginDto{
    email: string;
    password: string;
}

export interface RegisterDto{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
}

export interface AuthResponse{
    token: string;
    expiration: string;
    role: string;
    firstName: string;
}