import { Request, Response, NextFunction } from "express"
import { errorResponse } from "../utils/responseHelper";

export const errorHandler = (
    error: any,
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    console.error("❌ Backend Error:", error);

    const status = error.status || 500;

    //  Shield the user from raw database/code errors
    let message = error.message;
    if (status === 500) {
        message = null;
    }

    // 4. Return the sanitized response
    return errorResponse(res, { status, message });
}