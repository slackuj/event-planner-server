import { Response } from "express";
import {httpCodes} from "../constants/httpCodes";

interface SuccessParams {
    data?: any;
    message?: string | null;
    meta?: any;
    status?: number;
}

interface ErrorParams {
    message?: string;
    code?: string;
    details?: any;
    status?: number;
}


export const successResponse = (res: Response, { data = null, message = null, meta = null, status = 200 }: SuccessParams) => {
    return res.status(status).json({
        success: true,
        data,
        message,
        meta
    });
};

export const errorResponse = (res: Response, { message = "Something went wrong", code = httpCodes.INTERNAL_SERVER_ERROR.message, details = null, status = httpCodes.INTERNAL_SERVER_ERROR.statusCode }: ErrorParams) => {
    return res.status(status).json({
        success: false,
        data: null,
        message,
        error: {
            code,
            details
        }
    });
};