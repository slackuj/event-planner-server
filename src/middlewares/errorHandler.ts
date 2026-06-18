import { Request, Response, NextFunction } from "express";
import { errorResponse } from "../utils/responseHelper";
import { AppError } from "../utils/AppError";
import { httpCodes } from "../constants/httpCodes";

export const errorHandler = (
    error: any,
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    console.error("❌ Backend Error:", error);

    const isOperational = error instanceof AppError;

    //  Extract status, code, and details cleanly
    const status = isOperational ? error.status : httpCodes.INTERNAL_SERVER_ERROR.statusCode;
    const code = isOperational ? error.code : httpCodes.INTERNAL_SERVER_ERROR.code;
    const details = isOperational ? error.details : null;

    //  Data leakage mask: Only override message if it's an unexpected server error
    const message = (status === 500 && !isOperational)
        ? "Internal Server Error"
        : error.message;

    //  Return structured object response
    return errorResponse(res, { status, message, code, details });
};