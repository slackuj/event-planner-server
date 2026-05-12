export interface EventTagsQueryParams {
    fetchEventTags: boolean; // tags for event set by organizer
}

export interface AllEventsQueryParams {
    isParticipating: boolean;
    isRequested?: boolean; // for event requests ---> rsvp === 'AWAITING', requested and not responded yet
    isOrganized?: boolean;
}