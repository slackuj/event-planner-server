// checks for access token ! and populates Request with the user
import {NextFunction, Response} from "express";
import {errorResponse} from "../utils/responseHelper";
import jwt from "jsonwebtoken";
import {config} from "../config";
import {AuthenticatedUser} from "../types/user";
import {AuthRequest} from "../types/request";
import {httpCodes} from "../constants/httpCodes";

export const authenticate = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    // Extract the Bearer token from the header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return errorResponse(res, { status: 401, message: "No Access Token Provided" });
    }

    try {
        // Verify the token using the secret key
        // cast this to the combined user types defined in user.ts
        // Populate req.user for use in downstream controllers
        req.user = jwt.verify(token, config.JWT_SECRET_ACCESS) as AuthenticatedUser;
        next();
    } catch (error) {
        return errorResponse(res, { status: httpCodes.UNAUTHORIZED.statusCode, message: "Invalid or Expired Token" });
    }
};