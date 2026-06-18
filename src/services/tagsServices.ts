import {
    CreateEventTagRequest,
    CreateLocationTagRequest,
    CreateUserEventTagData,
    CreateUserLocationTagRequest,
    EventTag,
    EventTagResponse,
    LocationTag,
    UserEventTag,
    UserLocationTag
} from "../types/event";
import {database} from "../configurations/db";
import {Knex} from "knex";
import {logger} from "../utils/logger";
import slugify from "slugify";
import {EventTagsQueryParams} from "../types/QueryParams";
import {AppError} from "../utils/AppError";
import {httpCodes} from "../constants/httpCodes";

// create or update updated_at timestamp !!!
export const upsertLocationTag = async(data: CreateLocationTagRequest, trx?: Knex.Transaction) => {
    const { name } = data;
    const slug = slugify(name.trim(), {lower: true, strict: true});
    const queryBuilder = trx ? trx<LocationTag>("location_tags") : database<LocationTag>("location_tags");
    return queryBuilder
        .insert({
            name: name.trim(),
            slug,
            updated_at: new Date()
        })
        .onConflict("slug")
        .merge({
            updated_at: new Date()
        });
};

// create or update updated_at timestamp !!!
export const upsertUserLocationTag = async(data: CreateUserLocationTagRequest, trx?: Knex.Transaction) => {
    const { user_id, tag_id } = data;
    const queryBuilder = trx ? trx<UserLocationTag>("user_location_tags") : database<UserLocationTag>("user_location_tags");
    return queryBuilder
        .upsert({
            user_id,
            tag_id,
            updated_at: new Date()
        });
};

// delete user_location_tag
// NOT TO BE USED
export const deleteUserLocationTag = async(user_id: number, tag_id: number) => {
    const result = await database<UserLocationTag>("user_location_tags")
        .where({user_id, tag_id})
        .del();

    if (result === 0) {
        logger.info(`[TAGS-SERVICES] [DELETE-USER-LOCATION-TAG] nothing to delete for user: ${user_id} and location_id: ${tag_id}`);
    }
}

export const fetchLocationTagId = async(name: string, trx?: Knex.Transaction) => {
    const slug = slugify(name.trim(), {lower: true, strict: true});
    const queryBuilder = trx ? trx<LocationTag>("location_tags") : database<LocationTag>("location_tags");
    const location_tag = await queryBuilder
        .where({ slug })
        .select("id")
        .first();
    if (!location_tag) {
                logger.error(`[TAGS-SERVICES] [FETCH-LOCATION-BY-ID] failed accessing location_tag`);
                throw new AppError("Failed accessing location. Please try again.", httpCodes.INTERNAL_SERVER_ERROR);
            }
    return location_tag.id;
}

// create or update updated_at timestamp !!!
export const upsertEventTag = async(data: CreateEventTagRequest, trx?: Knex.Transaction) => {
    const { name } = data;
    const slug = slugify(name.trim(), {lower: true, strict: true});
    const queryBuilder = trx ? trx<EventTag>("event_tags") : database<EventTag>("event_tags");

    return queryBuilder
        .insert({
            name: name.trim(),
            slug,
            updated_at: new Date()
        })
        .onConflict("slug")
        .merge({
            updated_at: new Date()
        });
};

// create or update updated_at timestamp !!!
export const upsertUserEventTag = async(data: CreateUserEventTagData, trx?: Knex.Transaction) => {
    const { user_id, event_id, tag_id } = data;
    const queryBuilder = trx ? trx<UserEventTag>("user_event_tags") : database<UserEventTag>("user_event_tags");
    return queryBuilder
        .upsert({
            user_id,
            tag_id,
            event_id,
            //updated_at: new Date() HANDLE 'updated_at' field later, ABSENT IN DATABASE NOW, DO I NEED IT ???
        });
};

// fetches events_tag.tag_id
export const fetchEventTagId = async(name: string, trx?: Knex.Transaction) => {
    const slug = slugify(name.trim(), {lower: true, strict: true});
    const queryBuilder = trx ? trx<EventTag>("event_tags") : database<EventTag>("event_tags");
    const event_tag = await queryBuilder
        .where({ slug })
        .select("id")
        .first();
    if (!event_tag) {
        logger.error(`[TAGS-SERVICES] [FETCH-EVENT-TAG-BY-ID] failed accessing event_tag`);
        throw new AppError("Failed accessing event tag. Please try again.", httpCodes.INTERNAL_SERVER_ERROR);
    }
    return event_tag.id;
}

/*// fetch event_tag by event_id
// DOESN'T MAKES SENSE, ONE EVENT HAS MANY TAGS...AND HOW TO SELECT ONLY ONE TAG???
export const fetchEventTagById = async(event_id: number, user_id: number, organizer_id: number, params: EventTagsQueryParams) => {
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
        .select<EventTagResponse>("event_tags.name", "event_tags.id")
        .first();
};*/

