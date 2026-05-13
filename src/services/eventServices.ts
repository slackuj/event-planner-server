import {
    AllEventsResponse,
    CreateEventData,
    CreateUserEventTagRequest,
    Event,
    EventParticipant, EventParticipantResponse, EventTagResponse,
    EventWithLocationAndOrganizer,
    UpdateEventLocationRequest,
    UpdateEventRequest, UserEventTag
} from "../types/event";
import {database} from "../configurations/db";
import slugify from "slugify";
import * as tagsServices from "./tagsServices";
import {Knex} from "knex";
import {logger} from "../utils/logger";
import {AllEventsQueryParams, EventTagsQueryParams} from "../types/QueryParams";

export const create = async (data: CreateEventData) => {
    const { title, description, event_date, organizer_id, is_public } = data;
    return await database.transaction(async (trx) => {

        let location_id: number | null = null;
        if (data.location_name) {

            // upsert location_tag
            /// this at least updates `updated_at` field, such that we get to fetch recent tags !!!
            const [upsertResult] = await tagsServices.upsertLocationTag({name: data.location_name }, trx);
            if (!upsertResult) {
                logger.error(`[EVENT-SERVICES] [CREATE-EVENT] failed upserting location_tag`);
                throw new Error("Failed accessing location. Please try again.");
            }

            location_id = await tagsServices.fetchLocationTagId(data.location_name, trx);

            // upsert user_location_tag
            /// this at least updates `updated_at` field, such that we get to fetch recent tags !!!
            const [upsertResult2] = await tagsServices.upsertUserLocationTag({user_id: organizer_id, tag_id: location_id}, trx);
            if (!upsertResult2) { // i.e if upsertResult2 === 0
                logger.error(`[EVENT-SERVICES] [CREATE-EVENT] failed upserting user_location_tag`);
                throw new Error("Failed accessing location. Please try again.");
            }
        }

        // Create the Event
        const [event_id] = await trx<Event>("events").insert({
            title,
            description,
            event_date,
            is_public,
            organizer_id,
            location_id
        });

        if (!event_id) {
            throw new Error("Failed creating new event");
        }

        return await fetchEventById(event_id, undefined, trx);
    });
};

// updates : title, description, event_date, is_public, updated_at using event_id
export const updateEventById = async (data: UpdateEventRequest, event_id: number, user_id: number) => {
    const updatedRow = await database<Event>("events").update(data).where({id: event_id, organizer_id: user_id});
    if (updatedRow === 0) {
        throw new Error("Failed Updating Event: Inadequate authorization or event does not exists !");
    }
    return await fetchEventById(event_id);
};

// updates event's location : add or update
export const updateEventLocationById = async (data: UpdateEventLocationRequest, event_id: number, organizer_id: number) => {

    const { location_name } = data;
    const slug = slugify(location_name, {lower: true, strict: true});

    return await database.transaction(async (trx) => {

            // upsert location_tag
            /// this at least updates `updated_at` field, such that we get to fetch recent tags !!!
            const [upsertResult] = await tagsServices.upsertLocationTag({name: location_name}, trx);
            if (!upsertResult) {
                logger.error(`[EVENT-SERVICES] [CREATE-EVENT] failed upserting location_tag`);
                throw new Error("Failed accessing location. Please try again.");
            }

            const location_id = await tagsServices.fetchLocationTagId(slug, trx);

            // upsert user_location_tag
            // this at least updates `updated_at` field, such that we get to fetch recent tags !!!
        /***********************************************************************************************
            DATABASE TRANSACTION + USE OF ORGANIZER ID GUARANTEES THE UPDATE IS BEING DONE BY ORGANIZER
        /***********************************************************************************************/
            const [upsertResult2] = await tagsServices.upsertUserLocationTag({user_id: organizer_id, tag_id: location_id}, trx);
            if (!upsertResult2) { // i.e if upsertResult2 === 0
                logger.error(`[EVENT-SERVICES] [CREATE-EVENT] failed upserting user_location_tag`);
                throw new Error("Failed accessing location. Please try again.");
            }

        // Update the Event Location
        await database<Event>("events").update({location_id}).where({id: event_id});
        //if (updatedRow === 0) return null;
        return await fetchEventById(event_id, undefined, trx);
    });
};

// authorize in authorize.ts
// delete event location
// DONOT DELETE LOCATION TAG FROM user_location_tags TABLE
// BECAUSE MULTIPLE EVENTS CAN HAVE SAME LOCATION !!!
// ONLY UPDATE location_id to be null !!! IN events TABLE !! !! !!
export const deleteEventLocationById = async(event_id: number, organizer_id: number) => {
    const event = await database<Event>("events")
        .where({id: event_id, organizer_id: organizer_id})
        .update("location_id", null);

    if (event === 0) {
        throw new Error("Failed Deleting Event Location: Inadequate authorization or event does not exists!");
    }
};

// delete event by id
export const deleteEventById = async(event_id: number, user_id: number) => {
    const result = await database<Event>("events")
        .where({id: event_id, organizer_id: user_id})
        .del();

    if (result === 0) {
        throw new Error("Failed Deleting Event: Inadequate Authorization or Event does not exists!");
    }
};

// fetchAllEvents
export const fetchAllEvents = async (user_id: number, params: AllEventsQueryParams) => {

    // consider side-effects of undefined case for params if any....be cautious not to left any undefined !!!!
    const { isParticipating, isPublic, isRequested, isOrganized } = params;
    let events: AllEventsResponse[] = [];
    if (isOrganized) {
        // fetch all organized events by the user
        events = await database("events")
            .select<AllEventsResponse[]>(
                "events.id",
                "events.title",
                "events.event_date",
                "users.email as organizer_email",
                "users.profile_picture as organizer_profile_picture"
            )
            // leftJoin because location_id is nullable in your migration
            .leftJoin("location_tags", "events.location_id", "location_tags.id")
            // inner join because organizer_id is notNullable
            .join("users", "events.organizer_id", "users.id")
            .where("events.organizer_id", user_id)
            .andWhere("events.is_public", isPublic);
    }
    else if (!isParticipating) {
        // fetch all published events
        events = await database("events")
            .select<AllEventsResponse[]>(
                "events.id",
                "events.title",
                "events.event_date",
                "users.email as organizer_email",
                "users.profile_picture as organizer_profile_picture"
            )
            // leftJoin because location_id is nullable in your migration
            .leftJoin("location_tags", "events.location_id", "location_tags.id")
            // inner join because organizer_id is notNullable
            .join("users", "events.organizer_id", "users.id")
            .where("events.is_public", isPublic);
    }
    else {
        if (isRequested) {
            // return requested events
            events = await database("events")
                .select<AllEventsResponse[]>(
                    "events.id",
                    "events.title",
                    "events.event_date",
                    "users.email as organizer_email",
                    "users.profile_picture as organizer_profile_picture",
                    "event_participants.rsvp"
                )
                .join("event_participants", "events.id", "event_participants.event_id")
                // leftJoin because location_id is nullable in your migration
                .leftJoin("location_tags", "events.location_id", "location_tags.id")
                // inner join because organizer_id is notNullable
                .join("users", "events.organizer_id", "users.id")
                .where("event_participants.user_id", user_id)
                .andWhere("event_participants.rsvp", "AWAITING")
                .andWhere("events.is_public", isPublic);
        } else {
            // return participating events
            events = await database("events")
                .select<AllEventsResponse[]>(
                    "events.id",
                    "events.title",
                    "events.event_date",
                    "users.email as organizer_email",
                    "users.profile_picture as organizer_profile_picture",
                    "event_participants.rsvp"
                )
                .join("event_participants", "events.id", "event_participants.event_id")
                // leftJoin because location_id is nullable in your migration
                .leftJoin("location_tags", "events.location_id", "location_tags.id")
                // inner join because organizer_id is notNullable
                .join("users", "events.organizer_id", "users.id")
                .where("event_participants.user_id", user_id)
                .andWhere("events.is_public", isPublic)
                .andWhereNot("event_participants.rsvp", "AWAITING");
        }
    }


    // handle error
    if (!events) {
        throw new Error("Failed to retrieve events.");
    }

    return events;
};

// eventServices.ts

/**
 * Fetches an event by ID with authorization checks.
 * Allows access if:
 * 1. The event is public.
 * 2. The user is the organizer.
 * 3. The user is a participant.
 */
export const fetchEventById = async (id: number, user_id?: number, trx?: Knex.Transaction) => {
    const queryBuilder = trx ? trx("events") : database("events");

    const query = queryBuilder
        .select<EventWithLocationAndOrganizer>(
            "events.id",
            "events.title",
            "events.description",
            "events.event_date",
            "events.is_public",
            "events.created_at",
            "location_tags.name as location_name",
            "users.email as organizer_email",
            "users.profile_picture as organizer_profile_picture"
        )
        .leftJoin("location_tags", "events.location_id", "location_tags.id")
        .join("users", "events.organizer_id", "users.id")
        .where("events.id", id);

    // Apply authorization filter only if user_id is provided (API calls)
    // Internal calls (like after creation) pass undefined to bypass this check
    if (user_id) {
        query.andWhere(function() {
            this.where("events.is_public", true)
                .orWhere("events.organizer_id", user_id)
                .orWhereExists(function() {
                    this.select("*")
                        .from("event_participants")
                        .whereRaw("event_participants.event_id = events.id")
                        .andWhere("event_participants.user_id", user_id);
                });
        });
    }

    const event = await query.first();

    if (!event) {
        // Generic message for security (don't reveal if ID exists but is private)
        throw new Error("Event not found or access denied.");
    }

    return event;
};

/*************************************************************************************************/
/************************* SERVICES FOR EVENT PARTICIPANTS ***************************************/
/*************************************************************************************************/

// upsert event participation by user_id
// /events/:id/participation/:userId ---> id  = event_id
// eventServices.ts

export const upsertEventParticipationById = async(
    data: Omit<EventParticipant, 'id'>,
    requester_id: number // Added requester_id for authorization
) => {
    const { event_id } = data;

    // 1. Fetch event details to check if it's public or who the organizer is
    const event = await database("events")
        .select<Pick<Event, 'is_public' | 'organizer_id'>>("is_public", "organizer_id")
        .where("id", event_id)
        .first();

    if (!event) {
        throw new Error("Event not found.");
    }

    // 2. Check if the requester is already a participant
    const existingParticipation = await database<EventParticipant>("event_participants")
        .where({ event_id, user_id: requester_id })
        .first();

    // 3. Authorization Logic:
    // Allow if: Event is public OR requester is organizer OR requester is already a participant
    const isPublic = event.is_public;
    const isOrganizer = event.organizer_id === requester_id;
    const isParticipant = !!existingParticipation;

    if (!isPublic && !isOrganizer && !isParticipant) {
        throw new Error("Access denied. You do not have permission to modify participation for this private event.");
    }

    // 4. Proceed with upsert if authorized
    await database<EventParticipant>("event_participants").upsert(data);

    return await fetchEventParticipationById({
        user_id: data.user_id,
        event_id: data.event_id
    });
};

export const fetchEventParticipationById = async(data: Omit<EventParticipant, 'id' | 'rsvp'>) => {
    const eventParticipation =  database("event_participants")
        .join("users", "users.id", "event_participants.user_id")
        .select<EventParticipantResponse>(
            "event_participants.*",
            "users.email as user_email",
            "users.profile_picture as user_profile_picture"
        )
        // check if we can use .where(data) !!!
        .where("event_participants.event_id", data.event_id)
        .andWhere("event_participants.user_id", data.user_id)
        .first();

    if(!eventParticipation) {
        logger.warn(`[EVENT-SERVICES] [FETCH-EVENT-PARTICIPATION] failed retrieving event participation for user: ${data.user_id} event:${data.event_id}`);
        throw new Error("Failed to retrieve event participation. Please try again.");
    }

    // why is it still returning undefined ?
    return eventParticipation;
};

export const fetchAllEventParticipationByEventId = async(event_id: number) => {
    return database<EventParticipant>("event_participants")
        .join("users", "users.id", "event_participants.user_id")
        .select<EventParticipantResponse[]>(
            "event_participants.*",
            "users.email as user_email",
            "users.profile_picture as user_profile_picture"
        )
        .where("event_participants.event_id", event_id);
};

// eventServices.ts

export const removeEventParticipationById = async(
    data: Omit<EventParticipant, 'id' | 'rsvp'>,
    requester_id: number // Added requester_id parameter
) => {
    const { event_id, user_id } = data;

    // 1. Fetch the event to identify the organizer
    const event = await database("events")
        .select("organizer_id")
        .where("id", event_id)
        .first();

    if (!event) {
        throw new Error("Event not found.");
    }

    // 2. Authorization: Check if the requester is the organizer
    if (event.organizer_id !== requester_id) {
        throw new Error("Access denied. Only the organizer is allowed to remove participants.");
    }

    // 3. Proceed with removal
    const result = await database<EventParticipant>("event_participants")
        .where({ event_id, user_id })
        .del();

    if (result === 0) {
        logger.warn(`[EVENT-SERVICES] No participation record found for user ${user_id} in event ${event_id}`);
    }
};

/*************************************************************************************************/
/**************************** SERVICES FOR EVENT TAGS ********************************************/
/*************************************************************************************************/

// adds user_event_tags [used by user && organizer, ===>>> organizer is also user]
// POST: /events/:id/tags ---> id === event_id
export const addEventTagById = async(data: CreateUserEventTagRequest) => {
    const { tag_name, event_id, user_id, organizer_id } = data;

// Authorization Check
    const isOrganizer = user_id === organizer_id;

    const isParticipant = await database<EventParticipant>("event_participants")
        .where({ event_id, user_id })
        .first();

    if (!isOrganizer && !isParticipant) {
        throw new Error("Access denied. Only organizers or participants can add tags to event.");
    }

    // add or update `updated_at` for tag and return all user_event_tags
    await database.transaction(async (trx) => {

        // upsert location_tag
        /// this at least updates `updated_at` field, such that we get to fetch recent tags !!!
        const [upsertResult] = await tagsServices.upsertEventTag({name: tag_name}, trx);
        if (!upsertResult) {
            logger.error(`[EVENT-SERVICES] [ADD-EVENT-TAG] failed upserting location_tag`);
            throw new Error("Failed accessing event tag. Please try again.");
        }

        const event_id = await tagsServices.fetchEventTagId(tag_name, trx);

        // upsert user_location_tag
        /// this at least updates `updated_at` field, such that we get to fetch recent tags !!!
        const [upsertResult2] = await tagsServices.upsertUserEventTag({user_id, event_id, tag_id: event_id}, trx);
        if (!upsertResult2) { // i.e if upsertResult2 === 0
            logger.error(`[EVENT-SERVICES] [ADD-EVENT-TAG] failed upserting user_event_tag`);
            throw new Error("Failed accessing event. Please try again.");
        }

    });
    // fetch all event_tags
    return await fetchAllEventTagsById(event_id, user_id, organizer_id, {fetchEventOrganizersTags: user_id === organizer_id});
}

export const fetchAllEventTagsById = async(event_id: number, user_id: number, organizer_id: number, params: EventTagsQueryParams) => {

    // Authorization Check
    const isOrganizer = user_id === organizer_id;

    const isParticipant = await database<EventParticipant>("event_participants")
        .where({ event_id, user_id })
        .first();

    if (!isOrganizer && !isParticipant) {
        throw new Error("Access denied. Only organizers or participants can fetch event tags.");
    }

    const { fetchEventOrganizersTags } = params;
    let User_Id: number;
    if (fetchEventOrganizersTags) User_Id = organizer_id;
    // else fetch participant tags
    else User_Id = user_id;
    // HANDLE LATER

    // return event tags ( tags set by organizer or participant)
    return database("event_tags")
        //.join("user_event_tags", "event_tags.id", "=", "user_event_tags.tag_id")
        .join("user_event_tags", "event_tags.id", "user_event_tags.tag_id")
        .where("user_event_tags.user_id", User_Id)
        .andWhere("user_event_tags.event_id", event_id)
        .select<EventTagResponse[]>("event_tags.name");
};

// delete user_event_tag : tage === tag_name
export const deleteUserEventTag = async(user_id: number, event_id: number, tag: string) => {
    const tag_id = await tagsServices.fetchEventTagId(tag);
    await database<UserEventTag>("user_event_tags")
        .where({user_id, tag_id, event_id})
        .del();

    //if (result === 0) return "nothing to delete";
    // THIS SHOULD SET LOCATION ID === NULL IN EVENTS TABLE ---> cross check it !!!
}