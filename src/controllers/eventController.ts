import {NextFunction, Request, Response} from "express";
import * as eventServices from "../services/eventServices";
import {successResponse} from "../utils/responseHelper";
import {httpCodes} from "../constants/httpCodes";
import {AuthRequest} from "../types/request";
import {CreateEventData, CreateUserEventTagRequest} from "../types/event";
import {AllEventsQueryParams} from "../types/QueryParams";

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
        const response = await eventServices.updateEventById(req.body, Number(req.params.id));
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
        const response = await eventServices.updateEventLocationById(req.body, Number(req.params.id), user_id);
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
        await eventServices.deleteEventLocationById(Number(req.params.id));
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
        await eventServices.deleteEventById(Number(req.params.id));
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
        const response = await eventServices.fetchEventById(Number(req.params.id));
        return successResponse(
            res,
            { data: response },
        );
    } catch (error) {
        next(error);
    }
};

// adds event's tag by event_id
// POST: /events/:id/tags
export const addEventTagById = async(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
) => {
    try{
        const user_id = req.user!.id;
        const event_id = Number(req.params.id);
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