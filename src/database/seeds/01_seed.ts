import { Knex } from "knex";
import bcrypt from "bcrypt";
import {SALT_ROUNDS} from "../../constants/appConstants";

export async function seed(knex: Knex): Promise<void> {
    // Clear existing data in the correct order to respect Foreign Key constraints
    await knex("user_event_tags").del();
    await knex("event_participants").del();
    await knex("events").del();
    await knex("user_location_tags").del();
    await knex("location_tags").del();
    await knex("event_tags").del();
    await knex("token_table").del();
    await knex("user_sessions").del();
    await knex("users").del();

    const hashedPassword = await bcrypt.hash("passwordPW123#", SALT_ROUNDS);
    // Generate 5 users
    const users = [
        { name: "Alice Smith", email: "alice@example.com", password: hashedPassword, role: "USER" },
        { name: "Bob Jones", email: "bob@example.com", password: hashedPassword, role: "USER" },
        { name: "Charlie Brown", email: "charlie@example.com", password: hashedPassword, role: "USER" },
        { name: "Diana Prince", email: "diana@example.com", password: hashedPassword, role: "USER" },
        { name: "Evan Wright", email: "evan@example.com", password: hashedPassword, role: "USER" },
    ];

    const userIds: number[] = [];
    for (const u of users) {
        const [id] = await knex("users").insert(u);
        userIds.push(id!);
    }

    // Generate Location Tags and link them via User Location Tags
    const locationTags = [
        { name: "Main Convention Center", slug: "main-convention-center" },
        { name: "Tech Hub Room A", slug: "tech-hub-room-a" },
        { name: "HQ Virtual Room", slug: "hq-virtual-room" }
    ];

    const locTagIds: number[] = [];
    for (const lt of locationTags) {
        const [id] = await knex("location_tags").insert(lt);
        locTagIds.push(id!);
    }

    const userLocTagIds: number[] = [];
    for (let i = 0; i < locTagIds.length; i++) {
        // tag_id is unique per table definition
        await knex("user_location_tags").insert({
            user_id: userIds[i % userIds.length],
            tag_id: locTagIds[i]
        });
        userLocTagIds.push(locTagIds[i]!);
    }

    // Generate Event Tags
    const eventTags = [
        { name: "Technology", slug: "technology" },
        { name: "Sports", slug: "sports" },
        { name: "Music", slug: "music" },
        { name: "Art & Culture", slug: "art-culture" }
    ];

    const tagIds: number[] = [];
    for (const t of eventTags) {
        const [id] = await knex("event_tags").insert(t);
        tagIds.push(id!);
    }

    // Generate 6 Public and 6 Private Events across different timelines
    const now = new Date();
    const pastDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    const futureDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days in the future

    const eventTemplates = [
        // --- PAST EVENTS (2 Public, 2 Private) ---
        { title: "Past Global Tech Summit", description: "An incredible conference about tech and innovations that happened in the past.", event_date: pastDate, is_public: true },
        { title: "Past Live Music Festival", description: "An amazing outdoor summer music festival featuring various local bands.", event_date: pastDate, is_public: true },
        { title: "Past Strategy Meeting", description: "Confidential internal corporate strategy alignment session for executives.", event_date: pastDate, is_public: false },
        { title: "Past Stakeholder Dinner", description: "Private networking and dining event for high-tier enterprise partners.", event_date: pastDate, is_public: false },

        // --- TODAY EVENTS (2 Public, 2 Private) ---
        { title: "Today's Open Hackathon", description: "An all-day competitive coding sprint and innovation challenge happening today.", event_date: now, is_public: true },
        { title: "Today's Art Gallery Expo", description: "Public exhibition showcasing modern and classic visual arts starting today.", event_date: now, is_public: true },
        { title: "Today's Q2 Board Gathering", description: "Internal board of directors performance review meeting held right now.", event_date: now, is_public: false },
        { title: "Today's Internal Scrum Sync", description: "Daily project alignment, task updates, and unblocking for the development crew.", event_date: now, is_public: false },

        // --- FUTURE EVENTS (2 Public, 2 Private) ---
        { title: "Future Charity Marathon", description: "A public 5K charity run event aiming to raise awareness and donations.", event_date: futureDate, is_public: true },
        { title: "Future SaaS Product Launch", description: "The grand public unveiling and feature demonstration of our next-gen platform.", event_date: futureDate, is_public: true },
        { title: "Future Secret Milestone Gala", description: "A highly confidential internal celebration planning meeting for team members.", event_date: futureDate, is_public: false },
        { title: "Future Closed Budget Review", description: "Strictly private financial planning assessment for the upcoming fiscal quarter.", event_date: futureDate, is_public: false },
    ];

    const eventIds: number[] = [];
    for (let i = 0; i < eventTemplates.length; i++) {
        const template = eventTemplates[i];
        const organizer_id = userIds[i % userIds.length];
        const location_id = userLocTagIds[i % userLocTagIds.length]; // maps to user_location_tags.tag_id

        const [id] = await knex("events").insert({
            ...template,
            organizer_id,
            location_id
        });
        eventIds.push(id!);
    }

    // Add participants to the events (Mix of active participation 'YES' and pending 'AWAITING')
    const participantRecords: { id: number; eventId: number }[] = [];
    for (const eventId of eventIds) {
        const rsvps: ("YES" | "AWAITING" | "MAYBE")[] = ["YES", "AWAITING", "MAYBE"];

        for (let j = 0; j < 3; j++) {
            const userId = userIds[j % userIds.length];
            const rsvp = rsvps[j];

            const [pId] = await knex("event_participants").insert({
                event_id: eventId,
                user_id: userId,
                rsvp: rsvp
            });
            participantRecords.push({ id: pId!, eventId });
        }
    }

    // Add tags to all events
    // 'user_event_tags' migration schema explicitly states that both 'user_id'
    // and 'event_id' reference 'id' from 'event_participants' table.
    // Passing the valid participant record ID to both fields satisfies these foreign keys safely.
    for (const p of participantRecords) {
        const tag_id = tagIds[p.eventId % tagIds.length];
        await knex("user_event_tags").insert({
            user_id: p.id,
            event_id: p.id,
            tag_id: tag_id
        });
    }
}