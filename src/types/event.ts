export type RSVP = "YES" | "NO" | "MAYBE" | "WAITING";

export interface Event {
    id: number;
    title: string;
    description: string;
    event_date: Date;
    location_id: number | null;
    organizer_id: number;
    is_public: boolean;
    updated_at?: Date;
}

// service data
export interface CreateEventData extends Omit<Event, 'id' | 'location_id'> {
    location_name: string | null;
}

// client request
export type CreateEventRequest = Omit<CreateEventData, 'organizer_id'>;
export type UpdateEventRequest = Partial<Omit<CreateEventRequest, 'location_name'>>;
export interface UpdateEventLocationRequest {
    location_name: string;
}


interface EventParticipant {
    id: number;
    event_id: number;
    user_id: number;
    rsvp: RSVP;
}

export interface LocationTag {
    id: number;
    name: string;
    slug: string;
    updated_at?: Date;
}

export interface UserLocationTag {
    id: number;
    user_id: number;
    tag_id: number;
    updated_at?: Date;
}

export type CreateLocationTagRequest = Omit<LocationTag, 'id' | 'slug'>;
export type CreateUserLocationTagRequest = Omit<UserLocationTag, 'id'>;

export interface EventTag {
    id: number;
    name: string;
    slug: string;
    updated_at?: Date;
}

export interface EventTags {
    tag: string;
}

export interface UserEventTag{
    id: number;
    user_id: number;// organizer or participator
    event_id: number;
    tag_id: number;
    updated_at?: Date;
}

export type CreateEventTagRequest = Omit<EventTag, 'id' | 'slug'>;
export interface CreateUserEventTagRequest extends Omit<UserEventTag, 'id' | 'tag_id'>{
    tag_name: string;
    organizer_id: number;
}
export type CreateUserEventTagData = Omit<UserEventTag, 'id'>;