import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../types/request";
import {errorResponse} from "../utils/responseHelper";
import {httpCodes} from "../constants/httpCodes";
import {AuthenticatedUser} from "../types/user";

export const authorize = (event_id: string) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const user = req.user as AuthenticatedUser;
        if (!user) return next(new Error("User not authenticated"));
        // user.id from jwt, requestedId from params `/:id`
        // NOT REQUIRED, BECAUSE WE DON'T AUTHORIZE FOR SELF OPERATIONS ?
        //const isOwner = user.id === requestedId;

        // EMPLOY MECHANISM TO CHECK FOR EVENT'S ORGANIZER AND CURRENT USER
        /*// Check for the required permission
        if (!requiredRole.includes(user.role) /!*&& !isOwner*!/) {
            return errorResponse(
                res,
                {
                    status: httpCodes.UNAUTHORIZED.statusCode,
                    message: httpCodes.UNAUTHORIZED.message,
                },
            );
        }*/
        next();
    }
};