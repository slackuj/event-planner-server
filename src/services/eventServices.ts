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

        return await fetchEventById(event_id, trx);
    });
};

// updates : title, description, event_date, is_public, updated_at using event_id
export const updateEventById = async (data: UpdateEventRequest, event_id: number) => {
    await database<Event>("events").update(data).where({id: event_id});
    //if (updatedRow === 0) return null;
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
            /// this at least updates `updated_at` field, such that we get to fetch recent tags !!!
            const [upsertResult2] = await tagsServices.upsertUserLocationTag({user_id: organizer_id, tag_id: location_id}, trx);
            if (!upsertResult2) { // i.e if upsertResult2 === 0
                logger.error(`[EVENT-SERVICES] [CREATE-EVENT] failed upserting user_location_tag`);
                throw new Error("Failed accessing location. Please try again.");
            }

        // Update the Event Location
        await database<Event>("events").update({location_id}).where({id: event_id});
        //if (updatedRow === 0) return null;
        return await fetchEventById(event_id, trx);
    });
};

// authorize in authorize.ts
// delete event location
// DONOT DELETE LOCATION TAG FROM user_location_tags TABLE
// BECAUSE MULTIPLE EVENTS CAN HAVE SAME LOCATION !!!
// ONLY UPDATE location_id to be null !!! IN events TABLE !! !! !!
export const deleteEventLocationById = async(event_id: number) => {
    const event = await database<Event>("events")
        .where({id: event_id})
        .update("location_id", null);

    if (!event) {
        throw new Error("Event does not exists!");
    }
};

// delete event by id
export const deleteEventById = async(event_id: number) => {
    const result = await database<Event>("events")
        .where({id: event_id})
        .del();

    if (result === 0) return "nothing to delete";
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

// is it required to fetch inside transaction ? HANDLE LATER
export const fetchEventById = async (id: number, trx?: Knex.Transaction) => {
    // Use the passed trx if it exists, otherwise fall back to the main database instance
    const queryBuilder = trx ? trx("events") : database("events");

    const event = await queryBuilder
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
        // leftJoin because location_id is nullable in your migration
        .leftJoin("location_tags", "events.location_id", "location_tags.id")
        // inner join because organizer_id is notNullable
        .join("users", "events.organizer_id", "users.id")
        .where("events.id", id)
        .first();

    if (!event) {
        throw new Error("Failed to retrieve event.");
    }

    return event;
};




/*************************************************************************************************/
/************************* SERVICES FOR EVENT PARTICIPANTS ***************************************/
/*************************************************************************************************/

// upsert event participation by user_id
// /events/:id/participation/:userId ---> id  = event_id
export const upsertEventParticipationById = async(data: Omit<EventParticipant, 'id'>) => {
    await database<EventParticipant>("event_participants").upsert(data);
    return await fetchEventParticipationById({user_id: data.user_id, event_id: data.event_id});
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

export const removeEventParticipationById = async(data: Omit<EventParticipant, 'id' | 'rsvp'>) => {
    await database<EventParticipant>("event_participants").where(data).del();
    //if (result === 0) return "nothing to delete";
};

/*************************************************************************************************/
/**************************** SERVICES FOR EVENT TAGS ********************************************/
/*************************************************************************************************/

// adds user_event_tags [used by user && organizer, ===>>> organizer is also user]
// POST: /events/:id/tags ---> id === event_id
export const addEventTagById = async(data: CreateUserEventTagRequest) => {
    const { tag_name, event_id, user_id, organizer_id } = data;

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