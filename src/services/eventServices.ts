import {
    AllEventsResponse,
    CreateEventData,
    CreateUserEventTagRequest,
    Event,
    EventParticipant, EventParticipantResponse,
    EventWithLocationAndOrganizer,
    UpdateEventLocationRequest,
    UpdateEventRequest
} from "../types/event";
import {database} from "../configurations/db";
import slugify from "slugify";
import * as tagsServices from "./tagsServices";
import {Knex} from "knex";
import {logger} from "../utils/logger";
import {AllEventsQueryParams, EventTagsQueryParams} from "../types/QueryParams";

export const createEvent = async (data: CreateEventData) => {
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

// updates : title, description, event_date, is_public, updated_at
export const updateEventById = async (data: UpdateEventRequest, event_id: number) => {
    const updatedRow = await database<Event>("events").update(data).where({id: event_id});
    if (updatedRow === 0) return null;
    return await fetchEventById(event_id);
};

// updates event's location : add or update
export const updateEventLocation = async (data: UpdateEventLocationRequest, event_id: number, organizer_id: number) => {

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
        const updatedRow = await database<Event>("events").update({location_id}).where({id: event_id});
        if (updatedRow === 0) return null;
        return await fetchEventById(event_id, trx);
    });
};

// authorize in authorize.ts
// delete event location
export const deleteEventLocationById = async(event_id: number) => {
    const event = await database<Event>("events")
        .where({id: event_id})
        .select("location_id", "organizer_id")
        .first();

    if (!event) {
        throw new Error("Event does not exists!");
    }

    return await tagsServices.deleteUserLocationTag(event.organizer_id, event.location_id!)
};

// delete event by id
export const deleteEventByID = async(event_id: number) => {
    const result = await database<Event>("events")
        .where({id: event_id})
        .del();

    if (result === 0) return "nothing to delete";
};

// fetchAllEvents
export const fetchAllEvents = async (user_id: string, params: AllEventsQueryParams) => {

    const { isParticipating, isRequested, isOrganized } = params;
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
            .where("events.organizer_id", user_id);
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
            .where("events.is_public", true);
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
                .andWhere("event_participants.rsvp", "AWAITING");
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


// handle event tags

// add user_event_tags [used by user && organizer, ===>>> organizer is also user]
// POST: /events/:id/tags
export const addEventUserTagById = async(data: CreateUserEventTagRequest, params: EventTagsQueryParams) => {
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
    return await tagsServices.fetchAllEventTagsById(event_id, user_id, organizer_id, params);
}

/*************************************************************************************************/
/************************* SERVICES FOR EVENT PARTICIPANTS ***************************************/
/*************************************************************************************************/

// upsert event participation by user_id
// /events/:id/participation/:userId
export const upsertEventParticipationByUserId = async(data: Omit<EventParticipant, 'id'>) => {
    await database<EventParticipant>("event_participants").upsert(data);
    return await fetchEventParticipation({user_id: data.user_id, event_id: data.event_id});
};

export const fetchEventParticipation = async(data: Omit<EventParticipant, 'id' | 'rsvp'>) => {
    return database<EventParticipant>("event_participants")
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

export const removeEventParticipationById = async(id: number) => {
    const result = await database<EventParticipant>("event_participants").where({id}).del();
    if (result === 0) return "nothing to delete";
};