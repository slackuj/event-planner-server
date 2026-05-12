import {Router} from "express";
import {validateRequestBody} from "../middlewares/validator";
import {
    PasswordUpdateRequestSchema,
    SendConfirmationCodeSchema,
    UserConfirmationRequestSchema,
    UserLoginRequestSchema,
    UserRegisterRequestSchema
} from "../schemas/authSchema";
import * as authController from "../controllers/authController";
import {authenticate} from "../middlewares/authenticate";
import {authorize} from "../middlewares/authorize";
import {appRoles} from "../constants/roles";

export const authRoutes = Router();

authRoutes.post("/register", validateRequestBody(UserRegisterRequestSchema), authController.register);
authRoutes.post("/confirm", validateRequestBody(UserConfirmationRequestSchema), authController.confirmNewUser);
authRoutes.post("/resend-code", validateRequestBody(SendConfirmationCodeSchema), authController.resendConfirmationCode);
authRoutes.patch("/update-password", validateRequestBody(PasswordUpdateRequestSchema), authenticate, authController.updatePassword);
authRoutes.post("/login", validateRequestBody(UserLoginRequestSchema), authController.login);
authRoutes.post("/refresh", authController.refresh);
authRoutes.post("/logout", authenticate, authController.logout);