import {NextFunction, Request, Response} from "express";
import * as eventServices from "../services/eventServices";
import {successResponse} from "../utils/responseHelper";
import {httpCodes} from "../constants/httpCodes";
import {AuthRequest} from "../types/request";
import {CreateEventData, CreateUserEventTagRequest} from "../types/event";
import {AllEventsQueryParams, EventTagsQueryParams} from "../types/QueryParams";

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
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try{
        const response = await eventServices.updateEventById(req.body, Number(req.params.event_id));
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
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try{
        await eventServices.deleteEventLocationById(Number(req.params.event_id));
        return successResponse(
            res,
            { status: httpCodes.NO_CONTENT.statusCode },
        );
    } catch (error) {
        next(error);
    }
};

export const deleteEventById = async(
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try{
        await eventServices.deleteEventById(Number(req.params.event_id));
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
        const params = req.query as AllEventsQueryParams;
        const response = await eventServices.fetchAllEvents(user_id, params);
        return successResponse(
            res,
            { data: response },
        );
    } catch (error) {
        next(error);
    }
};

export const fetchEventById = async(
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try{
        const response = await eventServices.fetchEventById(Number(req.params.event_id));
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
        const params = req.query as EventTagsQueryParams;
        const {organizer_id} = req.body;
        const response = await eventServices.fetchAllEventTagsById(event_id, user_id, organizer_id, params);
        return successResponse(
            res,
            { data: response },
        );
    } catch (error) {
        next(error);
    }
};

// DELETE: /events/:event_id/tags
export const deleteUserEventTag = async(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
) => {
    try{
        const user_id = req.user!.id;
        const event_id = Number(req.params.event_id);
        const {tag} = req.body;
        const response = await eventServices.deleteUserEventTag(user_id, event_id, tag);
        return successResponse(
            res,
            { data: response },
        );
    } catch (error) {
        next(error);
    }
};

// /events/:event_id/participation/:user_id
export const upsertEventParticipationById = async(
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try{
        const user_id = Number(req.params.user_id);
        const event_id = Number(req.params.event_id);
        // handle undefined case
        const response = await eventServices.upsertEventParticipationById({user_id, event_id, ...req.body});
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
        const {event_id} = req.body;
        // handle undefined case
        const response = await eventServices.fetchAllEventParticipationByEventId(Number(event_id));
        return successResponse(
            res,
            { data: response },
        );
    } catch (error) {
        next(error);
    }
};

export const removeEventParticipationById = async(
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try{
        const user_id = Number(req.params.user_id);
        const event_id = Number(req.params.event_id);
        // handle undefined case
        await eventServices.removeEventParticipationById({user_id, event_id});
        return successResponse(
            res,
            {status: httpCodes.NO_CONTENT.statusCode },
        );
    } catch (error) {
        next(error);
    }
};