import { Router } from "express";
import * as eventController from "../controllers/eventController";
import { authenticate } from "../middlewares/authenticate";
import {
    validateRequestBody,
    validateParams,
    validateQueryParams
} from "../middlewares/validator";
import {
    CreateEventRequestSchema,
    UpdateEventRequestSchema,
    UpdateEventLocationRequestSchema,
    AddEventTagRequestSchema,
    EventParticipationRequestSchema,
    EventIdParamsSchema,
    AllEventsQueryParamsSchema, EventIdAndUserIdParamsSchema, EventTagsQueryParamsSchema,
    TagIdParamsSchema, EventIdAndTagIdParamsSchema,
} from "../schemas/eventSchema";

export const eventRoutes = Router();

/**
 * --- Event Management Routes ---
 */

// Create a new event
eventRoutes.post(
    "/",
    authenticate,
    validateRequestBody(CreateEventRequestSchema),
    eventController.create
);

// Fetch all events with filters (participating, organized, public, etc.)
eventRoutes.get(
    "/",
    authenticate,
    validateQueryParams(AllEventsQueryParamsSchema),
    eventController.fetchAllEvents
);

// Fetch event by event_id
/**
 * Fetches an event by ID with authorization checks.
 * Allows access if:
 * 1. The event is public.
 * 2. The user is the organizer.              AUTHORIZATION APPLIED IN SERVICE ---> REDUCES DATABASE OVERHEADS !!!
 * 3. The user is a participant.
 */
eventRoutes.get(
    "/:event_id",
    authenticate,
    validateParams(EventIdParamsSchema),
    eventController.fetchEventById
);

eventRoutes.patch(
    "/:event_id",
    authenticate,
    validateParams(EventIdParamsSchema),
    validateRequestBody(UpdateEventRequestSchema),
    eventController.updateEventById
);

eventRoutes.delete(
    "/:event_id",
    authenticate,
    validateParams(EventIdParamsSchema),
    eventController.deleteEventById
);

/**
 * --- Event Location Routes ---
 */

eventRoutes.patch(
    "/:event_id/location",
    authenticate,
    validateParams(EventIdParamsSchema),
    validateRequestBody(UpdateEventLocationRequestSchema),
    eventController.updateEventLocationById
);

eventRoutes.delete(
    "/:event_id/location",
    authenticate,
    validateParams(EventIdParamsSchema),
    eventController.deleteEventLocationById
);

/**
 * --- Event Tags Routes ---
 */

eventRoutes.post(
    "/:event_id/tags",
    authenticate,
    validateParams(EventIdParamsSchema),
    validateRequestBody(AddEventTagRequestSchema),
    eventController.addEventTagById
);

eventRoutes.get(
    "/:event_id/tags",
    authenticate,
    validateParams(EventIdParamsSchema),
    validateQueryParams(EventTagsQueryParamsSchema),
    eventController.fetchAllEventTagsById,
);

eventRoutes.delete(
    "/:event_id/tags/:user_event_tag_id",
    authenticate,
    validateParams(EventIdAndTagIdParamsSchema),
    eventController.deleteUserEventTag,
);
/**
 * --- Event Participation (RSVP) Routes ---
 */

// Upsert participation (The route pattern you requested)
// /events/:event_id/participation/:user_id

// WHICH METHOD TO USE FOR UPSERT OPERATION ???????????????????????

eventRoutes.post(
    "/:event_id/participation/",
    authenticate,
    validateParams(EventIdParamsSchema),
    validateRequestBody(EventParticipationRequestSchema),
    eventController.addEventParticipation
);

eventRoutes.patch(
    "/:event_id/participation/",
    authenticate,
    validateParams(EventIdParamsSchema),
    validateRequestBody(EventParticipationRequestSchema),
    eventController.updateEventParticipation
);

// Remove participation
eventRoutes.delete(
    "/:event_id/participation/:user_id",
    authenticate,
    validateParams(EventIdAndUserIdParamsSchema),
    eventController.removeEventParticipationById
);

// Get all participants for a specific event
eventRoutes.get(
    "/:event_id/participation",
    authenticate,
    validateParams(EventIdParamsSchema),
    eventController.fetchAllEventParticipationByEventId
);

// Get participant for a specific event by user_id
eventRoutes.get(
    "/:event_id/participation/:user_id",
    authenticate,
    validateParams(EventIdParamsSchema),
    eventController.fetchEventParticipationById
);