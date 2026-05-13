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
    AllEventsQueryParamsSchema, EventIdAndUserIdParamsSchema, EventTagsQueryParamsSchema, OrganizerIdParamsSchema,
    DeleteEventTagRequestSchema,
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
    validateRequestBody(OrganizerIdParamsSchema),// update later to appropriate schema
    eventController.fetchAllEventTagsById,
);

eventRoutes.delete(
    "/:event_id/tags",
    authenticate,
    validateParams(EventIdParamsSchema),
    validateRequestBody(DeleteEventTagRequestSchema),// update later to appropriate schema
    eventController.deleteUserEventTag,
);
/**
 * --- Event Participation (RSVP) Routes ---
 */

// Upsert participation (The route pattern you requested)
// /events/:event_id/participation/:user_id
eventRoutes.post(
    "/:event_id/participation/:user_id",
    authenticate,
    validateParams(EventIdAndUserIdParamsSchema),
    validateRequestBody(EventParticipationRequestSchema),
    eventController.upsertEventParticipationById
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