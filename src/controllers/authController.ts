import {NextFunction, Response, Request} from "express";
import * as authServices from "../services/authServices";
import {successResponse, errorResponse} from "../utils/responseHelper";
import {httpCodes} from "../constants/httpCodes";
import {AuthenticatedRequest} from "../types/request";
import {PasswordUpdateRequest} from "../types/auth";

export const resendConfirmationCode = async(
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const response = await authServices.resendConfirmationCode(req.body);
        return successResponse(
            res,
            {
                status: httpCodes.RESOURCE_CREATED.statusCode,
                data: {
                    expiresAt: response.expires_at.getTime(),
                    email: response.email,
                },
                message: "check your email for the confirmation code",
            },
        );
    } catch (error) {
        next(error);
    }
};

export const confirmNewUser = async(
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        await authServices.confirmNewUser(req.body);
        return successResponse(
            res,
            {}
        );
    } catch (error) {
        next(error);
    }
};

export const register = async(
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try{
        const response = await authServices.register(req.body);
        // return response
        return successResponse(
            res,
            {
                status: httpCodes.RESOURCE_CREATED.statusCode,
                data: {
                    expiresAt: response.expires_at.getTime(),
                    email: response.email,
                },
                message: "check your email for the confirmation code",
            },
        );
    } catch (error) {
        next(error);
    }
};

export const login = async(
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const response = await authServices.login(req.body);
        if ("expires_at" in response) {
            return successResponse(res, {
                    data: {...response, next: "/confirmMe"},
                },
            );
        } else {
            // set refreshToken in a secure cookie
            res.cookie("refreshToken", response.refreshToken,{
                httpOnly: true,
                secure: true,
                sameSite: "none",
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            });
            return successResponse(
                res,
                { data:
                        {
                            ...response,
                            next: "/dashboard",
                        }
                },
            );
        }
    } catch (error) {
        next(error);
    }
};

export const refresh = async(
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        //console.log("refreshToken", refreshToken);
        if (!refreshToken) {
            return errorResponse(
                res,
                {
                    status: httpCodes.UNAUTHORIZED.statusCode,
                    message: "Refresh token missing"
                });
        }

        const response = await authServices.refreshAccessToken(refreshToken);
        // set refreshToken in a secure cookie
        res.cookie("refreshToken", response.refreshToken,{
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
        return successResponse(
            res,
            { data: { accessToken :response.accessToken } },
        );
    } catch (error) {
        next(error);
    }
};

export const logout = async(
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
            return errorResponse(
                res,
                {
                    status: httpCodes.UNAUTHORIZED.statusCode,
                    message: "Refresh token missing"
                });
        }

        await authServices.logout(refreshToken);
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        });

        return successResponse( res, { status: httpCodes.NO_CONTENT.statusCode } );
    } catch (error) {
        next(error);
    }
};

export const updatePassword = async(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try{
        const email = req.user!.email;
        const data = { ...req.body, email } as Omit<PasswordUpdateRequest, 'confirm_new_password'>;
        const response = await authServices.updatePassword(data);

        // set refreshToken in a secure cookie
        res.cookie("refreshToken", response.refreshToken,{
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
        return successResponse(
            res,
            { data: { accessToken :response.accessToken } },
        );
    } catch (error) {
        next(error);
    }
};