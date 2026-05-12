import {Router} from "express";
import * as cloudinaryController from "../controllers/cloudinaryController";
import {authenticate} from "../middlewares/authenticate";

export const cloudinaryRoutes = Router();
cloudinaryRoutes.post(
    "/signature",
    authenticate,
    cloudinaryController.signature);