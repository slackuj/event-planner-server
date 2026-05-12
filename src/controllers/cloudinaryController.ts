import { Request, Response, NextFunction } from "express";
import * as cloudinaryServices from "../services/cloudinaryServices";
import {successResponse} from "../utils/responseHelper";

export const signature = async (
    req: Request,
    res: Response,
    next: NextFunction) => {
    try {
        const response = cloudinaryServices.signature();
        return successResponse(
            res,
            { data: response },
        );
    } catch (error) {
        next(error);
    }
};