import {Router} from "express";
import {cloudinaryRoutes} from "./cloudinaryRoutes";
import {authRoutes} from "./authRoutes";
import {userRoutes} from "./userRoutes";
import {eventRoutes} from "./eventRoutes";

export const routes = Router();
routes.use("/cloudinary", cloudinaryRoutes);
routes.use("/auth", authRoutes);
routes.use("/users", userRoutes);
routes.use("/events", eventRoutes);