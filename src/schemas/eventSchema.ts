import { z } from "zod";

/**
 * Schema for creating a new event
 */
export const CreateEventRequestSchema = z.object({
    title: z.string()
        .min(5, "Title must be at least 5 characters long")
        .max(255, "Title is too long"),
    description: z.string()
        .min(10, "Description must be at least 10 characters long")
        .max(1000, "Description is too long"),
    event_date: z.coerce.date(),
    is_public: z.boolean().default(false),
    location_name: z.string()
        .min(5, "Location must be at least 5 characters long")
        .max(255, "Location is too long")
        .nullable(),
});

/**
 * Schema for updating core event details
 */
export const UpdateEventRequestSchema = CreateEventRequestSchema.partial().omit({
    location_name: true
});

/**
 * Schema for updating an event's location specifically
 */
export const UpdateEventLocationRequestSchema = z.object({
    location_name: z.string()
        .min(5, "Location must be at least 5 characters long")
        .max(255, "Location is too long")
});

/**
 * Schema for adding a tag to an event
 */
export const AddEventTagRequestSchema = z.object({
    tag_name: z.string()
        .min(2, "Tag name must be at least 2 characters long")
        .max(30, "Tag name is too long"),
    organizer_id: z.coerce.number(),
});

/**
 * Schema for event participation/RSVP
 */
export const EventParticipationRequestSchema = z.object({
    rsvp: z.enum(["AWAITING", "YES", "NO", "MAYBE"],"Please select a valid RSVP status" ),
    email: z.email("invalid email address").optional(),
});

export const EventIdAndUserIdParamsSchema = z.object({
    event_id: z.coerce.number( "event_id type mismatch"),
    user_id: z.coerce.number("user_id type mismatch"),
});

export const EventIdParamsSchema = z.object({
    event_id: z.coerce.number("event_id type mismatch"),
});

export const UserIdParamsSchema = z.object({
    user_id: z.coerce.number("user_id type mismatch"),
});

export const TagIdParamsSchema = z.object({
    tag_id: z.coerce.number("user_id type mismatch"),
});

export const FetchAllEventTagsSchema = z.object({
    organizer_email: z.email("invalid email address"),
});

/**
 * Schema for filtering events via query parameters
 */

// Reusable helper for query param booleans
const queryBoolean = z.preprocess(
    (val: string) => (val === 'true' ? true : val === 'false' ? false : val),
    z.boolean()
);

export const AllEventsQueryParamsSchema = z.object({
    page: z.coerce.number().int().positive(),
    isParticipating: queryBoolean,
    isPublic: queryBoolean.optional(),
    isRequested: queryBoolean,
    isOrganized: queryBoolean,
});

export const EventTagsQueryParamsSchema = z.object({
    fetchEventOrganizersTags: queryBoolean,
});

export const ParticipantsQueryParamsSchema = z.object({
    page: z.coerce.number( "page type mismatch"),
})