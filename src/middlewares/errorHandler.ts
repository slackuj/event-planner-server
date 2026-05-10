import { Request, Response, NextFunction } from "express"
import { errorResponse } from "../utils/responseHelper";

export const errorHandler = (
    error: any,
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const { status, message } = error;

    return errorResponse(res, { status, message })
}