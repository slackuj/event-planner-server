import {
    AllEventsResponse,
    CreateEventData,
    CreateUserEventTagRequest,
    Event,
    EventParticipant, EventParticipationResponse, EventTagResponse,
    EventWithLocationAndOrganizer, ParticipationResponse,
    UpdateEventLocationRequest,
    UpdateEventRequest, UserEventTag
} from "../types/event";
import {database} from "../configurations/db";
import slugify from "slugify";
import * as tagsServices from "./tagsServices";
import {Knex} from "knex";
import {logger} from "../utils/logger";
import {AllEventsQueryParams, EventTagsQueryParams} from "../types/QueryParams";
import {DEFAULT_END_DATE, DEFAULT_START_DATE} from "../constants/appConstants";

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

        console.log("[event_id] returned during insert: is it newEvent_id ???");
        console.log("event_id", event_id);

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

    const event = await database("events")
        .select<Pick<Event, 'organizer_id' | 'is_public'>>("events.organizer_id", "events.is_public")
        .where("id", event_id)
        .first();

    if (!event) {
        throw new Error("Event not found.");
    }

    // Authorization: Check if the requester is the organizer
    if (event.organizer_id !== organizer_id) {
        throw new Error("Unauthorized: Cannot update event location.");
    }

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
        await trx("events").update({location_id}).where({id: event_id});
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
// fetchAllEvents
export const fetchAllEvents = async (user_id: number, params: AllEventsQueryParams) => {

    const {
        isParticipating,
        isPublic,
        isRequested,
        isOrganized,
        page = 1,
        start_date = new Date(DEFAULT_START_DATE),
        end_date = new Date(DEFAULT_END_DATE),
        sort_order = 'desc',
    } = params;
    console.log("params inside service", params);

    const limit = 4;
    const offset = (page - 1) * limit;


    // 2. Initialize the Base Query
    // We start with a base query to reuse the same logic for both data and counting
    const query = database("events");

    if (isOrganized) {
        // select all organized events: private + public
        query
            .leftJoin("location_tags", "events.location_id", "location_tags.id")
            .join("users", "events.organizer_id", "users.id")
            .where("events.organizer_id", user_id);
            //.andWhere("events.is_public", isPublic);
    }
    else if (!isParticipating) {
        query
            .leftJoin("location_tags", "events.location_id", "location_tags.id")
            .join("users", "events.organizer_id", "users.id")
            .where("events.is_public", isPublic);
    }
    else {
        // select all participating events: public + private
        query.join("event_participants", "events.id", "event_participants.event_id")
            .leftJoin("location_tags", "events.location_id", "location_tags.id")
            .join("users", "events.organizer_id", "users.id")
            .where("event_participants.user_id", user_id);
            //.andWhere("events.is_public", isPublic);

        if (isRequested) {
            query.andWhere("event_participants.rsvp", "AWAITING");
        } else {
            query.andWhereNot("event_participants.rsvp", "AWAITING");
        }
    }

    // date-filtering
        query.where("events.event_date", ">=", start_date);
        query.where("events.event_date", "<=", end_date);

    // 3. Execute count and data fetch in parallel
    const [totalResult, events] = await Promise.all([
        query.clone().count("events.id as total").first(),
        query.clone()
            .select<AllEventsResponse[]>(
                "events.id",
                "events.title",
                "events.event_date",
                "events.is_public",
                "users.email as organizer_email",
                "users.profile_picture as organizer_profile_picture",
                // Include rsvp if it's a participation query
                isParticipating ? "event_participants.rsvp" : database.raw('NULL as rsvp')
            )
            .limit(limit)
            .offset(offset)
            .orderBy("events.event_date", sort_order)
    ]);

    if (!events) {
        throw new Error("Failed to retrieve events.");
    }

    const totalEvents = parseInt(totalResult?.total as string) || 0;
    const totalPages = Math.ceil(totalEvents / limit);

    // 4. Return Data with Metadata
    return {
        events,
        metadata: {
            totalEvents,
            totalPages,
            page,
            limit
        }
    };
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

// add event participation : POST `/events/:event_id/participation`
export const addEventParticipation = async(data: Omit<EventParticipant, 'id'>, organizer_id?: number) => {
    const { event_id, user_id } = data;

    // check for private events or is_organizer
    // fetchEventById EFFECTIVELY SATISFIES CONDITION FOR PUBLIC EVENT OR IS_ORGANIZER !!!
    // Fetch the event to identify the organizer
    const event = await database("events")
        .select<Pick<Event, 'organizer_id' | 'is_public'>>("events.organizer_id", "events.is_public")
        .where("id", event_id)
        .first();

    if (!event) {
        throw new Error("Event not found.");
    }

    // Authorization: Check if the requester is the organizer
    if (organizer_id && event.organizer_id !== organizer_id) {
        throw new Error("Access denied: Cannot add participants.");
    }
    // Authorization: Check if event is private and user is not organizer
    // allow organizer to join private directly !!!
    if ( !organizer_id && !event.is_public && event.organizer_id !== user_id ) {
        throw new Error("Access denied: Cannot join private events.");
    }

    const [newParticipation] = await database<EventParticipant>("event_participants")
        .insert(data);

    if (!newParticipation) {
        throw new Error("Failed adding Event Participation");
    }

    console.log("[newParticipation] returned during insert: is it newParticipation_id ???");
    console.log("newParticipation", newParticipation);

    const participation =  await fetchEventParticipationById({user_id, event_id});

    /**********************************************************************************************
     **************** --- HANDLE THIS undefined return LATER --- **********************************
     *********************************************************************************************/
    if (!participation) {
        throw new Error("Error fetching Event Participation.");
    }

    return participation;
};

// upsert event participation by user_id
// /events/:id/participation/:userId ---> id  = event_id
// eventServices.ts
// used by user for self updates, organizer can remove only

export const updateEventParticipation = async(
    data: Omit<EventParticipant, 'id'>,
) => {
    const { event_id, user_id, rsvp } = data;

    const updatedEvent = await database<EventParticipant>("event_participants")
        .update("rsvp", rsvp)
        .where({event_id, user_id});

    if (updatedEvent === 0) {
        throw new Error("Event Participation not found.");
    }

    const participation =  await fetchEventParticipationById({
        user_id: data.user_id,
        event_id: data.event_id
    });

    /**********************************************************************************************
     **************** --- HANDLE THIS undefined return LATER --- **********************************
     *********************************************************************************************/
    if (!participation) {
        throw new Error("Error fetching Event Participation.");
    }

    return participation;
};

// returns event participation for current_user only
export const fetchEventParticipationById = async(data: Omit<EventParticipant, 'id' | 'rsvp'>) => {

    const eventParticipation =  await database("event_participants")
        .join("users", "users.id", "event_participants.user_id")
        .select<ParticipationResponse>(
            "event_participants.rsvp",
        )
        // check if we can use .where(data) !!!
        .where("event_participants.event_id", data.event_id)
        .andWhere("event_participants.user_id", data.user_id)
        .first();

    console.log("eventParticipation", eventParticipation);
    if(!eventParticipation) {
        logger.warn(`[EVENT-SERVICES] [FETCH-EVENT-PARTICIPATION] failed retrieving event participation for user: ${data.user_id} event:${data.event_id}`);
        console.log("i am here");
        return { rsvp: undefined };
    }

    // why is it still returning undefined ?
    // UNDEFINED IS NOT RETURNED OF REMOVING .first() ????
    return eventParticipation;
};

export const fetchAllEventParticipationByEventId = async(event_id: number) => { //}, params: ParticipantsQueryParams) => {

    /*const { page = 1 } = params;
    const limit = 4;
    const offset = (page - 1) * limit;*/

    // Base Query
    const query = database<EventParticipant>("event_participants")
        .join("users", "users.id", "event_participants.user_id")
        .where("event_participants.event_id", event_id);

    // Execute count and data fetch in parallel
    const [totalResult, participants] = await Promise.all([
        query.clone().count("event_participants.user_id as total").first(),
        query.clone()
            .select<EventParticipationResponse[]>(
                "event_participants.*",
                "users.email as user_email",
                "users.profile_picture as user_profile_picture"
            )
            //.limit(limit)
            //.offset(offset)
            .orderBy("users.email", "asc")
    ]);

    if (!participants) {
        throw new Error("Failed to retrieve participants.");
    }

    //const totalParticipants = parseInt(totalResult?.total as string) || 0;
    //const totalPages = Math.ceil(totalParticipants / limit);

    return {
        participants,
        /*metadata: {
            totalParticipants,
            totalPages,
            page,
            limit
        }*/
    };
};

// eventServices.ts

export const removeEventParticipationById = async(
    data: Omit<EventParticipant, 'id' | 'rsvp'>,
    requester_id: number
) => {
    const { event_id, user_id } = data;

    // Fetch the event to identify the organizer
    const event = await database("events")
        .select<Pick<Event, 'organizer_id'>>("events.organizer_id")
        .where("id", event_id)
        .first();

    if (!event) {
        throw new Error("Event not found.");
    }

    // Authorization: Check if the requester is the organizer
    if (event.organizer_id !== requester_id) {
        throw new Error("Access denied. Only the organizer is allowed to remove participants.");
    }

    // Proceed with removal
    const result = await database<EventParticipant>("event_participants")
        .where({ event_id, user_id })
        .del();

    // cleanup user_event_tags for the id if any THIS BLOCK SHALL BE NOT NEEDED AFTERWARDS, AS user_event_tags has been updated to reference event_participants !!!
    // REMOVE THIS LATER ON MIGRATION
    await database("user_event_tags")
        .where({event_id, user_id})
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
    const { tag_name, event_id, user_id } = data;

    // add or update `updated_at` for tag and return all user_event_tags
    const tag_id = await database.transaction(async (trx) => {

        // upsert location_tag
        /// this at least updates `updated_at` field, such that we get to fetch recent tags !!!
        const [tag_id] = await tagsServices.upsertEventTag({name: tag_name}, trx); // upsert return tag_id on success !!!
        //console.log("upsertResult", upsertResult);
        if (!tag_id) {
            logger.error(`[EVENT-SERVICES] [ADD-EVENT-TAG] failed upserting location_tag`);
            throw new Error("Failed accessing event tag. Please try again.");
        }

        //const tag_id = await tagsServices.fetchEventTagId(tag_name, trx);
        //console.log("tag_id", tag_id);

        /// this at least updates `updated_at` field, such that we get to fetch recent tags !!!
        const [upsertResult2] = await tagsServices.upsertUserEventTag({user_id, event_id, tag_id}, trx);
        if (!upsertResult2) { // i.e if upsertResult2 === 0
            logger.error(`[EVENT-SERVICES] [ADD-EVENT-TAG] failed upserting user_event_tag`);
            throw new Error("Failed accessing event. Please try again.");
        }

        return tag_id;

    });
    // return event_tag
    return database("event_tags")
        //.join("user_event_tags", "event_tags.id", "=", "user_event_tags.tag_id")
        .join("user_event_tags", "event_tags.id", "user_event_tags.tag_id")
        .where("user_event_tags.user_id", user_id)
        .andWhere("user_event_tags.event_id", event_id)
        .andWhere("user_event_tags.tag_id", tag_id)
        .select<EventTagResponse>(
            "event_tags.name as name",
            "user_event_tags.id as id",
            "user_event_tags.event_id",
            "user_event_tags.user_id",
        )
        .first();
}

export const fetchAllEventTagsById = async(event_id: number, user_id: number, params: EventTagsQueryParams) => {

    // Fetch the event to identify the organizer
    const event = await database("events")
        .select<Pick<Event, 'organizer_id'>>("events.organizer_id")
        .where("id", event_id)
        .first();

    if (!event) {
        throw new Error("Event not found.");
    }

    const { fetchEventOrganizersTags } = params;
    let User_Id: number;
    if (fetchEventOrganizersTags) User_Id = event.organizer_id;
    // else fetch participant tags
    else User_Id = user_id;
    // HANDLE LATER

    // return event tags ( tags set by organizer or participant)
    return database("event_tags")
        //.join("user_event_tags", "event_tags.id", "=", "user_event_tags.tag_id")
        .join("user_event_tags", "event_tags.id", "user_event_tags.tag_id")
        .where("user_event_tags.user_id", User_Id)
        .andWhere("user_event_tags.event_id", event_id)
        .select<EventTagResponse[]>(
            "event_tags.name as name",
            "user_event_tags.id as id",
            "user_event_tags.event_id",
            "user_event_tags.user_id",
        );
};

// delete user_event_tag : tage === tag_name
export const deleteUserEventTag = async(user_id: number, event_id: number, user_event_tag_id: number) => {
    await database<UserEventTag>("user_event_tags")
        .where({user_id, id: user_event_tag_id, event_id})
        .del();

    //if (result === 0) return "nothing to delete";
    // THIS SHOULD SET LOCATION ID === NULL IN EVENTS TABLE ---> cross check it !!!
}