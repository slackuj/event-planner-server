import { z } from "zod";
import {strongPasswordSchema} from "./globalSchema";

export const UserRegisterRequestSchema = z.object({
    name: z.string().min(5, "Name must be at least 5 characters long"),
    email: z.email("Invalid email address"),
    password: strongPasswordSchema,
    confirm_password: strongPasswordSchema,
}).refine(
    (data) => data.password === data.confirm_password, {
        message: "Passwords don't match",
        path: ["confirm_password"], // This attaches the error to the confirm_password field
    }
).transform(({ confirm_password, ...data }) => data);// strips confirm_password from the final object returned by zod after validation (i.e schema.safeParse(req.body) inside validator.ts !!!)

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
    old_password: z.string().min(1, "Enter your current password"),
    new_password: strongPasswordSchema,
    confirm_new_password: strongPasswordSchema,
}).refine(
    (data) => data.new_password === data.confirm_new_password, {
        message: "Passwords don't match",
        path: ["confirm_password"],
    }
).transform(({ confirm_new_password, ...data }) => data);// strips confirm_new_password from the final object returned by zod after validation (i.e schema.safeParse(req.body) inside validator.ts !!!)