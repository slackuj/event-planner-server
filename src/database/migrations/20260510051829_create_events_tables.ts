import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    return knex.schema
        // Tags for Events
        .createTable("event_tags", (table) => {
            table.increments("id").primary();
            table.string("name").unique().notNullable();
            table.string("slug").unique().notNullable();
            table.timestamps(true, true);
        })
        // Tags for Locations
        .createTable("location_tags", (table) => {
            table.increments("id").primary();
            table.string("name").unique().notNullable();
            table.string("slug").unique().notNullable();
            table.timestamps(true, true);
        })


        // User Location Tags
        .createTable("user_location_tags", (table) => {
            table.increments("id").primary();
            table.integer("user_id").unsigned().references("id").inTable("users").onDelete("CASCADE");
            // unique tag_id
            table.integer("tag_id").unsigned().unique().references("id").inTable("location_tags").onDelete("CASCADE");
            table.timestamps(true, true);
        })

        // Events Table
        .createTable("events", (table) => {
            table.increments("id").primary();
            table.string("title").notNullable();
            table.string("description", 1000);
            table.timestamp("event_date").notNullable();
            table.integer("location_id").unsigned().nullable()
                .references("tag_id").inTable("user_location_tags").onDelete("SET NULL");
            table.integer("organizer_id").unsigned().notNullable()
                .references("id").inTable("users").onDelete("CASCADE");
            table.boolean("is_public").defaultTo(false);
            table.timestamps(true, true);

            table.check("length(title) >= 5", [], "title_min_length");
            table.check("length(description) >= 10", [], "desc_min_length");
        })
        // Participants Table
        .createTable("event_participants", (table) => {
            table.increments("id").primary();
            table.integer("event_id").unsigned().references("id").inTable("events").onDelete("CASCADE");
            table.integer("user_id").unsigned().references("id").inTable("users").onDelete("CASCADE");
            table.enum("rsvp", ["YES", "NO", "MAYBE", "WAITING"]).defaultTo("WAITING");
        })
        // User Event Tags
        .createTable("user_event_tags", (table) => {
            table.increments("id").primary();
            table.integer("user_id").unsigned().references("id").inTable("users").onDelete("CASCADE");
            table.integer("event_id").unsigned().references("id").inTable("events").onDelete("CASCADE");
            table.integer("tag_id").unsigned().references("id").inTable("event_tags").onDelete("CASCADE");
        })
        ;
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema
        .dropTableIfExists("user_location_tags")
        .dropTableIfExists("user_event_tags")
        .dropTableIfExists("event_participants")
        .dropTableIfExists("events")
        .dropTableIfExists("location_tags")
        .dropTableIfExists("event_tags");
}