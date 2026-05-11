import {
    CreateEventTagRequest,
    CreateLocationTagRequest,
    CreateUserEventTagData,
    CreateUserLocationTagRequest,
    EventTag,
    EventTags,
    LocationTag,
    UserEventTag,
    UserLocationTag
} from "../types/event";
import {database} from "../configurations/db";
import {Knex} from "knex";
import {logger} from "../utils/logger";
import slugify from "slugify";
import {EventTagsQueryParams} from "../types/QueryParams";

// create or update updated_at timestamp !!!
export const upsertLocationTag = async(data: CreateLocationTagRequest, trx?: Knex.Transaction) => {
    const { name } = data;
    const slug = slugify(name.trim(), {lower: true, strict: true});
    const queryBuilder = trx ? trx<LocationTag>("location_tags") : database<LocationTag>("location_tags");
    return queryBuilder
        .upsert({
            name: name.trim(),
            slug,
            // check if it works even by skipping updated_at field !!!
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
export const deleteUserLocationTag = async(user_id: number, tag_id: number) => {
    const result = await database<UserLocationTag>("user_location_tags")
        .where({user_id, tag_id})
        .del();

    if (result === 0) return "nothing to delete";
    // THIS SHOULD SET LOCATION ID === NULL IN EVENTS TABLE ---> cross check it !!!
    return result;
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
                throw new Error("Failed accessing location. Please try again.");
            }
    return location_tag.id;
}

// create or update updated_at timestamp !!!
export const upsertEventTag = async(data: CreateEventTagRequest, trx?: Knex.Transaction) => {
    const { name } = data;
    const slug = slugify(name.trim(), {lower: true, strict: true});
    const queryBuilder = trx ? trx<EventTag>("event_tags") : database<EventTag>("event_tags");
    return queryBuilder
        .upsert({
            name: name.trim(),
            slug,
            // check if it works even by skipping updated_at field !!!
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
            updated_at: new Date()
        });
};

export const fetchEventTagId = async(name: string, trx?: Knex.Transaction) => {
    const slug = slugify(name.trim(), {lower: true, strict: true});
    const queryBuilder = trx ? trx<EventTag>("event_tags") : database<EventTag>("event_tags");
    const event_tag = await queryBuilder
        .where({ slug })
        .select("id")
        .first();
    if (!event_tag) {
        logger.error(`[TAGS-SERVICES] [FETCH-EVENT-TAG-BY-ID] failed accessing event_tag`);
        throw new Error("Failed accessing event tag. Please try again.");
    }
    return event_tag.id;
}

export const fetchAllEventTagsById = async(event_id: number, user_id: number, organizer_id: number, params: EventTagsQueryParams) => {
    const { fetchEventTags = true } = params;
    let User_Id: number;
    if (fetchEventTags) User_Id = organizer_id;
    // else fetch participant tags
    else User_Id = user_id;
    // HANDLE LATER

    // return event tags ( tags set by organizer)
    return database<EventTag>("event_tags")
        .join("user_event_tags", "event_tags.id", "=", "user_event_tags.tag_id")
        .where("user_event_tags.user_id", User_Id)
        .select<EventTags[]>("event_tags.name");
};

// delete user_event_tag : tage === tag_name
export const deleteUserEventTag = async(user_id: number, tag: string) => {
    const tag_id = await fetchEventTagId(tag);
    const result = await database<UserEventTag>("user_event_tags")
        .where({user_id, tag_id})
        .del();

    if (result === 0) return "nothing to delete";
    // THIS SHOULD SET LOCATION ID === NULL IN EVENTS TABLE ---> cross check it !!!
    return result;
}