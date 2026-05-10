export type RSVP = "YES" | "NO" | "MAYBE" | "WAITING";

interface Event {
    id: number;
    title: string;
    description: string;
    event_date: Date;
    location: number;
    organizer_id: string;
    is_public: boolean;
}

interface EventParticipant {
    id: number;
    event_id: number;
    user_id: number;
    rsvp: RSVP;
}

interface EventLocation {
    id: number;
    location: string;
}

interface EventTag {
    id: number;
    user_id: number;
    event_id: number;
    tag: string;
}

interface UserEventTag{
    id: number;
    user_id: number;
    event_id: number;
    tag_id: number;
}