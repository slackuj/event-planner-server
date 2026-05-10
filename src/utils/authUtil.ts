import jwt from "jsonwebtoken";
import { config } from "../config";
import {AuthenticatedUser} from "../types/user";

export const generateAccessToken = (user : AuthenticatedUser ) => {
    return jwt.sign(
        {
            exp: Math.floor(Date.now() / 1000) + 15 * 60, //  15 minutes
            //exp: Math.floor(Date.now() / 1000) + 60, //  1 minute
            id: user.id,
            email: user.email,
        },
        config.JWT_SECRET_ACCESS,
    )
};


export const generateRefreshToken = (user : AuthenticatedUser) => (
    jwt.sign(
        {
            exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,// 30 days
            userId: user.id,
        },
        config.JWT_SECRET_REFRESH,
    )
);