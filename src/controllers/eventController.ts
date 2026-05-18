import {NextFunction, Request, Response} from "express";
import * as eventServices from "../services/eventServices";
import * as userServices from "../services/userServices";
import {successResponse} from "../utils/responseHelper";
import {httpCodes} from "../constants/httpCodes";
import {AuthRequest} from "../types/request";
import {CreateEventData, CreateUserEventTagRequest} from "../types/event";
import {AllEventsQueryParams, EventTagsQueryParams, ParticipantsQueryParams} from "../types/QueryParams";
import {AllEventsQueryParamsSchema, EventTagsQueryParamsSchema} from "../schemas/eventSchema";

export const create = async(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
) => {
    try{
        const user_id = req.user!.id;
        const createEventData = { ...req.body, organizer_id: user_id } as CreateEventData;
        const response = await eventServices.create(createEventData);
        return successResponse(
            res,
            {
                status: httpCodes.RESOURCE_CREATED.statusCode,
                data: response,
            },
        );
    } catch (error) {
        next(error);
    }
};

export const updateEventById = async(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
) => {
    try{
        const user_id = req.user!.id;
        const response = await eventServices.updateEventById(req.body, Number(req.params.event_id), user_id);
        return successResponse(
            res,
            {
                data: response,
            },
        );
    } catch (error) {
        next(error);
    }
};

export const updateEventLocationById = async(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
) => {
    try{
        const user_id = req.user!.id;
        const response = await eventServices.updateEventLocationById(req.body, Number(req.params.event_id), user_id);
        return successResponse(
            res,
            {
                data: response,
            },
        );
    } catch (error) {
        next(error);
    }
};

export const deleteEventLocationById = async(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
) => {
    try{
        const user_id = req.user!.id;
        await eventServices.deleteEventLocationById(Number(req.params.event_id), user_id);
        return successResponse(
            res,
            { status: httpCodes.NO_CONTENT.statusCode },
        );
    } catch (error) {
        next(error);
    }
};

export const deleteEventById = async(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
) => {
    try{
        const user_id = req.user!.id;
        await eventServices.deleteEventById(Number(req.params.event_id), user_id);
        return successResponse(
            res,
            { status: httpCodes.NO_CONTENT.statusCode },
        );
    } catch (error) {
        next(error);
    }
};

export const fetchAllEvents = async(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
) => {
    try{
        const user_id = req.user!.id;
        const params = AllEventsQueryParamsSchema.parse(req.query);
        //console.log("params inside controller", params);
        const response = await eventServices.fetchAllEvents(user_id, params);
        return successResponse(
            res,
            {
                data: response.events,
                meta: response.metadata,
            },
        );
    } catch (error) {
        next(error);
    }
};

export const fetchEventById = async(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
) => {
    try{
        const user_id = req.user!.id;
        const response = await eventServices.fetchEventById(Number(req.params.event_id), user_id);
        return successResponse(
            res,
            { data: response },
        );
    } catch (error) {
        next(error);
    }
};

// adds event's tag by event_id
// POST: /events/:event_id/tags
export const addEventTagById = async(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
) => {
    try{
        const user_id = req.user!.id;
        const event_id = Number(req.params.event_id);
        const createUserEventTagRequest = {...req.body, event_id, user_id} as CreateUserEventTagRequest;
        const response = await eventServices.addEventTagById(createUserEventTagRequest);
        return successResponse(
            res,
            { data: response },
        );
    } catch (error) {
        next(error);
    }
};

// GET: /events/:event_id/tags
export const fetchAllEventTagsById = async(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
) => {
    try{
        const user_id = req.user!.id;
        const event_id = Number(req.params.event_id);
        const params = EventTagsQueryParamsSchema.parse(req.query);
        const response = await eventServices.fetchAllEventTagsById(event_id, user_id, params);
        return successResponse(
            res,
            { data: response },
        );
    } catch (error) {
        next(error);
    }
};

// DELETE: /events/:event_id/tags/:tag_id
export const deleteUserEventTag = async(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
) => {
    try{
        const user_id = req.user!.id;
        const event_id = Number(req.params.event_id);
        const user_event_tag_id = Number(req.params.user_event_tag_id);
        const response = await eventServices.deleteUserEventTag(user_id, event_id, user_event_tag_id);
        return successResponse(
            res,
            { data: response },
        );
    } catch (error) {
        next(error);
    }
};

// POST /events/:event_id/participation
export const addEventParticipation = async(
    req: AuthRequest, // Changed from Request to AuthRequest to access req.user
    res: Response,
    next: NextFunction,
) => {
    try {
        const user_id = req.user!.id;
        const event_id = Number(req.params.event_id);
        const { rsvp, email } = req.body;

        const response = email ?
            await eventServices.addEventParticipation({ user_id: await userServices.fetchUserIdByEmail(email), event_id, rsvp }, user_id)
            :
            await eventServices.addEventParticipation({ user_id, event_id, ...req.body });

        return successResponse(
            res,
            { data: response },
        );
    } catch (error) {
        next(error);
    }
};

// PATCH /events/:event_id/participation
export const updateEventParticipation = async(
    req: AuthRequest, // Changed from Request to AuthRequest to access req.user
    res: Response,
    next: NextFunction,
) => {
    try {
        const user_id = req.user!.id;
        const event_id = Number(req.params.event_id);

        const response = await eventServices.updateEventParticipation({ user_id, event_id, ...req.body });

        return successResponse(
            res,
            { data: response },
        );
    } catch (error) {
        next(error);
    }
};

// /events/:event_id/participation/:user_id
export const fetchEventParticipationById = async(
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try{
        const user_id = Number(req.params.user_id);
        const event_id = Number(req.params.event_id);
        // handle undefined case
        const response = await eventServices.fetchEventParticipationById({user_id, event_id});
        return successResponse(
            res,
            { data: response },
        );
    } catch (error) {
        next(error);
    }
};

// /events/:id/participation
export const fetchAllEventParticipationByEventId = async(
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try{
        const event_id = Number(req.params.event_id);
        // handle undefined case
        const params = req.query as ParticipantsQueryParams;
        const response = await eventServices.fetchAllEventParticipationByEventId(event_id, params);
        return successResponse(
            res,
            {
                data: response.participants,
                meta: response.metadata,
            },
        );
    } catch (error) {
        next(error);
    }
};

// eventController.ts

export const removeEventParticipationById = async(
    req: AuthRequest, // Changed from Request to AuthRequest
    res: Response,
    next: NextFunction,
) => {
    try {
        const requester_id = req.user!.id; // Authenticated user ID
        const user_id = Number(req.params.user_id); // ID of the participant to be removed
        const event_id = Number(req.params.event_id);

        // Pass the requester_id to the service for authorization check
        await eventServices.removeEventParticipationById({user_id, event_id}, requester_id);

        return successResponse(
            res,
            { status: httpCodes.NO_CONTENT.statusCode },
        );
    } catch (error) {
        next(error);
    }
};