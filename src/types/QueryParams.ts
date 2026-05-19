export interface EventTagsQueryParams {
    fetchEventOrganizersTags?: boolean; // tags for event set by organizer
}

export interface AllEventsQueryParams {
    page?: number;
    isParticipating?: boolean;
    isPublic?: boolean | undefined;
    isRequested?: boolean;
    isOrganized?: boolean;
    start_date?: Date;
    end_date?: Date;
    sort_order?: 'asc' | 'desc';
}

export interface ParticipantsQueryParams {
    page?: number;
}