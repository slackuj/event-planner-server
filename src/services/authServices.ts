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
import {Token, User} from "../types/user";

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
            })
            .returning(["id"]);

        if (!new_user) {
            throw new Error("Registration failed!");
        }
        // Create the confirmation token record
        await trx("token_table").insert({
            confirmation_code: code,
            user_id: new_user.id,
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



/*
// resends a new confirmation code
export const resendConfirmationCode = async (data: SendConfirmationCodeRequest) => {
    const { email } = data;
    const existingUser = await UserModel.exists({ email: email });
    if (existingUser) {
        logger.warn(`[AUTH-SERVICES] [CONFIRMATION CODE] Confirmation code requested for confirmed user: ${email}`);
        throw new Error("User already exists");
    }

    const existingUnconfirmedUser = await UnconfirmedUserModel.findOne({ email });
    if (existingUnconfirmedUser) {
        existingUnconfirmedUser.confirmationCode = await mailServices.sendNewAccountConfirmationEmail(email);
        existingUnconfirmedUser.expiresAt = otpExpiryDate();
        // save changes
        await existingUnconfirmedUser.save();
        return existingUnconfirmedUser;

    } else {
        logger.error(`[AUTH-SERVICES] [CONFIRMATION CODE] Confirmation requested for unregistered user: ${email}`);
        throw new Error("User not registered");
    }
};

export const login = async (data: UserLoginRequest) => {

    const { email, password } = data;

    const [authUser, incompleteUser] = await Promise.all([
        UserModel.findOne({ email }).select("+password"),
        IncompleteUserModel.findOne({ email }).select("+password")
    ]);
    const user = authUser || incompleteUser;

    if (!user) {
        // should the error message be implicit ?
        logger.error("[AUTH-SERVICES] [LOGIN] Login failed: User not found");
        throw new Error("The email you entered isn't connected to an account");
    }
    // HANDLE DELETED USERS
    if (authUser?.shouldDelete){
        return {
            expiresAt: authUser.expiresAt!.getTime(),
            next: "/recoverMe",
            email: email,
        };
    }

    //console.log(password);
    //console.log(user);
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        logger.warn(`[AUTH-SERVICES] [LOGIN] Unauthorized login attempt for: ${email}`);
        throw new Error("The password you entered is incorrect.");
    }

    const isIncompleteUser = !!incompleteUser;
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    try {
        const refreshTokenData = jwt.verify(refreshToken, config.JWT_SECRET_REFRESH) as JwtPayload;
        const expiresAt = new Date(refreshTokenData.exp! * 1000);
        await sessionServices.createSession({
            userId: user.id,
            refreshToken,
            expiresAt
        });
        return {
            accessToken,
            refreshToken,
            isIncompleteUser: isIncompleteUser
        };
    } catch (error) {
        logger.error(`[AUTH-SERVICES] [LOGIN] Session init failed for ${user.id}:`, error);
        throw new Error("Failed to initialize session. Please try again.");
    }
};

export const refreshAccessToken = async (refreshToken: string) => {
    // 1. Verify the signature and expiration of the refresh token
    let payload: JwtPayload;
    try {
        payload = jwt.verify(refreshToken, config.JWT_SECRET_REFRESH) as JwtPayload;
    } catch (error) {
        logger.error(`[AUTH-SERVICES] [REFRESH] Invalid or expired refresh token`);
        throw new Error("Invalid or expired refresh token");
    }

    // 2. Check if the session exists in the DB (Stateful check)
    const session = await sessionServices.findSessionByToken(refreshToken);
    if (!session) {
        logger.error(`[AUTH-SERVICES] [REFRESH] Session not found`);
        throw new Error("Session not found");
    }

    const [authUser, incompleteUser] = await Promise.all([
        UserModel.findById(payload.userId),
        IncompleteUserModel.findById(payload.userId)
    ]);
    const user = authUser || incompleteUser;

    if (!user) {
        throw new Error("No Active Account Found");
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    try {
        const refreshTokenData = jwt.verify(newRefreshToken, config.JWT_SECRET_REFRESH) as JwtPayload;
        const expiresAt = new Date(refreshTokenData.exp! * 1000);
        await sessionServices.createSession({
            userId: user.id,
            refreshToken: newRefreshToken,
            expiresAt
        });
        // delete old refresh token and return
        await sessionServices.deleteSessionByToken(refreshToken);
        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        };
    } catch (error) {
        logger.error(`[AUTH-SERVICES] [REFRESH] Session Initialization failed`);
        throw new Error("Failed to initialize session. Please try again.");
    }
};


export const logout = async (refreshToken: string) => {
    await sessionServices.deleteSessionByToken(refreshToken);
};

export const updatePassword = async (data: Omit<PasswordUpdateRequest, 'confirmNewPassword'>) => {

    const { email, oldPassword, newPassword } = data;
    const [authUser, incompleteUser] = await Promise.all([
        UserModel.findOne({ email }).select("+password"),
        IncompleteUserModel.findOne({ email }).select("+password")
    ]);
    const user = authUser || incompleteUser;

    if (!user) {
        logger.warn(`[AUTH-SERVICES] [LOGOUT] unregistered user: ${email} trying to log in`);
        throw new Error("The email you entered isn't connected to an account");
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
        logger.error(`[AUTH-SERVICES] [LOGOUT] Incorrect password for user: ${email}`);
        throw new Error("The password you entered is incorrect.");
    }

    // update password
    const hashed_password = await bcrypt.hash(newPassword, SALT_ROUNDS );
    let updatedUser;
    const isIncompleteUser =  !!incompleteUser;

    if (isIncompleteUser) {
        // findOneAndUpdate( filter, update, options )
        updatedUser = await IncompleteUserModel.findOneAndUpdate(
            { email: email },
            { password: hashed_password },
            { returnDocument: "after" },
        );
    } else {
        updatedUser = await UserModel.findOneAndUpdate(
            { email: email },
            { password: hashed_password },
            { returnDocument: "after" },
        );
    }
    const newAccessToken = generateAccessToken(updatedUser!);
    const newRefreshToken = generateRefreshToken(updatedUser!);

    // discard all old sessions
    await sessionServices.deleteSessionsById(user.id);

    // create new session and return
    const refreshTokenData = jwt.verify(newRefreshToken, config.JWT_SECRET_REFRESH) as JwtPayload;
    const expiresAt = new Date(refreshTokenData.exp! * 1000);
    await sessionServices.createSession({
        userId: user.id,
        refreshToken: newRefreshToken,
        expiresAt
    });
    logger.info(`[AUTH-SERVICES] [UPDATE PASSWORD] Password updated for user: ${email}`);
    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
    };
};*/
