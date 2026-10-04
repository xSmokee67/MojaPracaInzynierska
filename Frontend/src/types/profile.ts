export interface ProfileDto {
    userId: number;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    documentNumber: string;
    role: string;
    registrationDate: string;
}

export interface UpdateProfileDto {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    documentNumber: string;
}

export interface ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}