import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    return knex.schema
        .createTable("events", (table) => {
            table.increments("id").primary();
            table.string("title").notNullable();
            table.string("description", 1000);
            table.timestamp("event_date").notNullable();
            table.string("location");
            table.integer("organizer_id").unsigned().references("id").inTable("users").onDelete("CASCADE");
            table.boolean("is_public").defaultTo(true);
            table.timestamps(true, true);

            table.check("length(title) >= 5", [], "title_should_be_at_least_5_characters_long");
            table.check("length(description) >= 10", [], "description_should_be_at_least_10_characters_long");
        })
        .createTable("event_participants", (table) => {
            table.increments("id").primary();
            table.integer("event_id").unsigned().references("id").inTable("events").onDelete("CASCADE");
            table.integer("user_id").unsigned().references("id").inTable("users").onDelete("CASCADE");

            table.enum("rsvp", ["YES", "NO", "MAYBE", "WAITING"])
                .defaultTo("WAITING")
                .notNullable();
        })
        .createTable("event_tags", (table) => {
            table.increments("id").primary();
            table.string("tag").unique().notNullable();
        })
        .createTable("user_event_tags", (table) => {
            table.increments("id").primary();
            table.integer("user_id").unsigned().references("id").inTable("users");
            table.integer("event_id").unsigned().references("id").inTable("events");
            table.integer("tag_id").unsigned().references("id").inTable("event_tags");
        });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema
        .dropTableIfExists("user_event_tags")
        .dropTableIfExists("event_tags")
        .dropTableIfExists("event_participants")
        .dropTableIfExists("events");
}