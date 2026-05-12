import {Router} from "express";
//import {cloudinaryRoutes} from "./cloudinaryRoutes";
import {authRoutes} from "./authRoutes";
//import {userRoutes} from "./userRoutes";

export const routes = Router();
//routes.use("/cloudinary", cloudinaryRoutes);
routes.use("/auth", authRoutes);
//routes.use("/users", userRoutes);