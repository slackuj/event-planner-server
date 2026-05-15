export interface EventTagsQueryParams {
    fetchEventOrganizersTags?: boolean; // tags for event set by organizer
}

export interface AllEventsQueryParams {
    page?: number;
    isParticipating?: boolean;
    isPublic?: boolean;
    isRequested?: boolean; // for event requests ---> rsvp === 'AWAITING', requested and not responded yet
    isOrganized?: boolean;
}

export interface ParticipantsQueryParams {
    page?: number;
}