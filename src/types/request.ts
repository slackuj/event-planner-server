import {AuthenticatedUser} from "./user";
import {Request} from "express";

export interface AuthenticatedRequest extends Request {
    user?: AuthenticatedUser;
}

export type AuthRequest = AuthenticatedRequest;