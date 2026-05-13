import { Router } from "express";
import * as userController from "../controllers/userController";
import { authenticate } from "../middlewares/authenticate";
import { validateRequestBody } from "../middlewares/validator";
import { UpdateUserRequestSchema } from "../schemas/userSchema";

export const userRoutes = Router();

// Route for the logged-in user to see their own profile
userRoutes.get(
    "/me",
    authenticate,
    userController.getMe
);

// Route for the logged-in user to update their profile
userRoutes.patch(
    "/me",
    authenticate,
    validateRequestBody(UpdateUserRequestSchema),
    userController.updateMe
);