export interface UserModel {
    name: string;
    passwordDigest: string;
    email: string;
    emailPassword: string;
    recordsEmail: string;
    balance: number;
    forgotPasswordToken: string;

    [s: string]: any;
}
