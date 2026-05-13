import { Response, NextFunction } from "express";
import * as userServices from "../services/userServices";
import { successResponse } from "../utils/responseHelper";
import { AuthRequest } from "../types/request";

export const getMe = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const user_id = Number(req.params.user_id);
        const user = await userServices.fetchUserById(user_id);

        return successResponse(res, { data: user });
    } catch (error) {
        next(error);
    }
};

export const updateMe = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const user_id = req.user!.id;
        const updatedUser = await userServices.updateUserById(user_id, req.body);

        return successResponse(res, {
            message: "Profile updated successfully",
            data: updatedUser
        });
    } catch (error) {
        next(error);
    }
};