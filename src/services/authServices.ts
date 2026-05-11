import {SALT_ROUNDS} from "../constants/appConstants";
import bcrypt from "bcrypt";
import {generateAccessToken, generateRefreshToken} from "../utils/authUtil";
import jwt, {JwtPayload} from "jsonwebtoken";
import {config} from "../config";
import * as sessionServices from "./sessionServices";
import * as mailServices from "./mailServices";
import {
    PasswordUpdateRequest,
    SendConfirmationCodeRequest,
    UserConfirmationRequest,
    UserLoginRequest,
    UserRegisterRequest
} from "../types/auth";
import {otpExpiryDate} from "../utils/otpUtil";
import {logger} from "../utils/logger";
import {database} from "../configurations/db";
import {Token, User, UserSession} from "../types/user";

type registerData = Omit<UserRegisterRequest, "confirm_password">;
export const register = async (data: registerData, code: string) => {
    const { name, email, password } = data;

    // Check if User exists
    const existingUser = await database<User>("users")
        .where({ email })
        .first();

    if (existingUser) {
        if (existingUser.role === "USER") {
            // return next(/login) + 'account already exist, please login message'
            logger.warn(`[AUTH-SERVICES] [REGISTER] Duplicate Registration attempt: ${email}`);
            throw new Error("User already exists");
        } else {
            // return next(/confirmMe) + 'account already registered, please confirm message'
            logger.warn(`[AUTH-SERVICES] [REGISTER] Unconfirmed user re-registering: ${email}`);
            throw new Error("User already registered, please confirm your account");
        }
    }

    const hashed_password = await bcrypt.hash(password, SALT_ROUNDS);

    // Use transaction to ensure both user and token are created
    return await database.transaction(async (trx) => {
        // Create the user record
        const [new_user] = await trx<User>("users")
            .insert({
                email,
                password: hashed_password,
                name
            });
            //.returning(["id"]); // MySQL does not support returning

        if (!new_user) {
            throw new Error("Registration failed!");
        }
        // Create the confirmation token record
        await trx("token_table").insert({
            confirmation_code: code,
            user_id: new_user,
            expires_at: otpExpiryDate(),
        });

        logger.info(`[AUTH-SERVICES] [REGISTER] User created (unconfirmed): ${email}`);
    });
};

// service to confirm new account
export const confirmNewUser = async (data: UserConfirmationRequest) => {
    const { email, code } = data;

    // Fetch user and their associated confirmation token
    // We join the tables to verify the user exists and has a pending token
    const token = await database("users")
        .join("token_table", "users.id", "=", "token_table.user_id")
        .where("users.email", email)
        .andWhere("token_table.confirmation_code", code)
        .select<Token>("token_table.*")
        .first();

    // Validate user existence and current status
    if (!token) {
        logger.warn(`[AUTH-SERVICES] [CONFIRMATION] Attempt for unregistered user: ${email}`);
        throw new Error("User not registered or no confirmation code found");
    }

    // Validate Token Expiration
    if (new Date() > new Date(token.expires_at)) {
        logger.warn(`[AUTH-SERVICES] [CONFIRMATION] Code expired for user: ${email}`);
        throw new Error("Code Expired");
    }

    // Validate Confirmation Code
    if (code !== token.confirmation_code) {
        logger.error(`[AUTH-SERVICES] [CONFIRMATION] Invalid code for user: ${email}`);
        throw new Error("Invalid Confirmation Code");
    }

    // Atomic Update: Change role and delete the token/s
    try {
        await database.transaction(async (trx) => {
            // Update user role to 'USER'
            await trx("users")
                .where({ id: token.id })
                .update({ role: "USER" });

            // Remove all tokens for user
            await trx("token_table")
                .where({ user_id: token.user_id })
                .del();
        });

        logger.info(`[AUTH-SERVICES] [CONFIRMATION] Account confirmed successfully: ${email}`);
    } catch (error) {
        logger.error(`[AUTH-SERVICES] [CONFIRMATION] Transaction failed for ${email}:`, error);
        throw new Error("Failed to confirm account. Please try again.");
    }
};



// resends a new confirmation code
export const resendConfirmationCode = async (data: SendConfirmationCodeRequest) => {
    const { email } = data;

    // Find the user
    const user = await database<Pick<User, 'id' | 'role'>>("users")
        .select("id", "role")
        .where({ email })
        .first();

    if (!user) {
        logger.warn(`[AUTH-SERVICES] [RESEND-CODE] Attempt for non-existent user: ${email}`);
        throw new Error("User not found");
    }

    // Check if the user is already confirmed
    if (user.role === "USER") {
        logger.warn(`[AUTH-SERVICES] [RESEND-CODE] Attempt for already confirmed user: ${email}`);
        throw new Error("Account is already confirmed. Please log in.");
    }

    await database.transaction(async (trx) => {
        // Insert the new code
        await trx("token_table").insert({
            confirmation_code: code,
            user_id: user.id,
            expires_at: otpExpiryDate(),
        });
    });

    // 4. Send the new code via email
    const code = await mailServices.sendNewAccountConfirmationEmail(email);

    logger.info(`[AUTH-SERVICES] [RESEND-CODE] New code sent to: ${email}`);
    return code;
};

export const login = async (data: UserLoginRequest) => {
    const { email, password } = data;

    // Find user by email
    const user = await database<User>("users")
        .where({ email })
        .first();

    if (!user) {
        logger.warn(`[AUTH-SERVICES] [LOGIN] User not found: ${email}`);
        throw new Error("The email or password you entered is incorrect.");
    }

    if (user.role === "UNCONFIRMED") {
        // next(/confirmMe) + message
        logger.warn(`[AUTH-SERVICES] [LOGIN] Unconfirmed User's login attempt: ${email}`);
        throw new Error("Please confirm your account before logging in.");
    }

    // Verify Password
    const isPasswordMatched = await bcrypt.compare(password, user.password);
    if (!isPasswordMatched) {
        logger.warn(`[AUTH-SERVICES] [LOGIN] Invalid password for: ${email}`);
        throw new Error("The email or password you entered is incorrect.");
    }

    // Generate Tokens
    const accessToken = generateAccessToken({id: user.id, email: user.email});
    const refreshToken = generateRefreshToken({id: user.id, email: user.email});

    const refreshTokenData = jwt.verify(refreshToken, config.JWT_SECRET_REFRESH) as JwtPayload;
    const expiresAt = new Date(refreshTokenData.exp! * 1000);

    await sessionServices.createSession({
        user_id: user.id,
        refresh_token: refreshToken,
        expires_at: expiresAt
    });

    logger.info(`[AUTH-SERVICES] [LOGIN] User logged in: ${email}`);

    // Return tokens and user info (excluding password)
    const { password: _, ...rest } = user;
    return {
        accessToken,
        refreshToken,
        user: rest
    };
};

// refresh user
export const refreshAccessToken = async (refreshToken: string) => {
    // Verify the Refresh Token signature and expiration
    let decoded: JwtPayload;
    try {
        decoded = jwt.verify(refreshToken, config.JWT_SECRET_REFRESH) as JwtPayload;
    } catch (error) {
        logger.error(`[AUTH-SERVICES] [REFRESH] Invalid refresh token signature`);
        throw new Error("Invalid refresh token");
    }

    // Check if the session exists in the database
    // This allows for "Revocation" - if the row is gone, the token is invalid
    const session = await database<UserSession>("user_sessions")
        .where({ refresh_token: refreshToken })
        .first();

    if (!session) {
        logger.warn(`[AUTH-SERVICES] [REFRESH] Session not found or revoked`);
        throw new Error("Session expired or revoked");
    }

    // Fetch the user
    const user = await database<User>("users")
        .where({ id: decoded.user_id })
        .first();

    if (!user) {
        logger.error(`[AUTH-SERVICES] [REFRESH] User not found for session: ${session.user_id}`);
        throw new Error("User no longer exists");
    }

    // new tokens
    const newRefreshToken = generateRefreshToken({id: user.id, email: user.email});
    const newAccessToken = generateAccessToken({id: user.id, email: user.email});

    const refreshTokenData = jwt.verify(refreshToken, config.JWT_SECRET_REFRESH) as JwtPayload;
    const expiresAt = new Date(refreshTokenData.exp! * 1000);

    await sessionServices.createSession({
        user_id: user.id,
        refresh_token: refreshToken,
        expires_at: expiresAt
    });

    // delete old session
    await sessionServices.deleteSessionByToken(refreshToken);

    logger.info(`[AUTH-SERVICES] [REFRESH] Access token rotated for user: ${user.email}`);

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
    };
};


export const logout = async (refreshToken: string) => {
    await sessionServices.deleteSessionByToken(refreshToken);
};

export const updatePassword = async (data: Omit<PasswordUpdateRequest, 'confirm_new_password'>) => {
    const { email, old_password, new_password } = data;
    // Fetch the user
    const user = await database<User>("users")
        .where({ email })
        .select("password", "id")
        .first();

    if (!user) {
        throw new Error("User not found");
    }

    // Verify the old password
    const isMatched = await bcrypt.compare(old_password, user.password);
    if (!isMatched) {
        throw new Error("Invalid current password");
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(new_password, SALT_ROUNDS);

    const newAccessToken = generateAccessToken({id: user.id, email});
    const newRefreshToken = generateRefreshToken({id: user.id, email});

    await database.transaction(async (trx) => {
        // Update the password
        await trx("users")
            .where({ id: user.id })
            .update({ password: hashedNewPassword, updated_at: new Date() });

        // delete all sessions
        await sessionServices.deleteSessionsByUserId(user.id);

        // create new session
        const refreshTokenData = jwt.verify(newRefreshToken, config.JWT_SECRET_REFRESH) as JwtPayload;
        const expiresAt = new Date(refreshTokenData.exp! * 1000);
        await sessionServices.createSession({
            user_id: user.id,
            refresh_token: newRefreshToken,
            expires_at: expiresAt
        });
    });

    logger.info(`[AUTH-SERVICES] [UPDATE PASSWORD] Password updated for user: ${email}`);
    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
    };
};
