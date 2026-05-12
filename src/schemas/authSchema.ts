import { z } from "zod";
import {strongPasswordSchema} from "./globalSchema";

export const UserRegisterRequestSchema = z.object({
    name: z.string().min(5, "Name must be at least 5 characters long"),
    email: z.email("Invalid email address"),
    password: strongPasswordSchema,
    confirmPassword: strongPasswordSchema,
}).refine(
    (data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"], // This attaches the error to the confirmPassword field
    }
).transform(({ confirmPassword, ...data }) => data);// strips confirmPassword from the final object returned by zod after validation (i.e schema.safeParse(req.body) inside validator.ts !!!)

export const UserConfirmationRequestSchema = z.object({
    email: z.email("Invalid email address"),
    code: z.string().length(6)
});

export const SendConfirmationCodeSchema = z.object({
    email: z.email("Invalid email address"),
});

export const UserLoginRequestSchema = z.object({
    email: z.email("Please enter a valid email address"),
    password: z.string(),
});

export const PasswordUpdateRequestSchema = z.object({
    oldPassword: z.string().min(1, "Enter your current password"),
    newPassword: strongPasswordSchema,
    confirmNewPassword: strongPasswordSchema,
}).refine(
    (data) => data.newPassword === data.confirmNewPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"], // This attaches the error to the confirmPassword field
    }
).transform(({ confirmNewPassword, ...data }) => data);// strips confirmNewPassword from the final object returned by zod after validation (i.e schema.safeParse(req.body) inside validator.ts !!!)