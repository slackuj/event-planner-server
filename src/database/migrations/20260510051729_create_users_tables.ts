import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    return knex.schema
        .createTable("users", (table) => {
            table.increments("id").primary();
            table.string("name").notNullable();
            table.string("email").unique().notNullable();
            table.string("password").notNullable();

            //Limit role to "USER" or "UNCONFIRMED"
            table.enum("role", ["USER", "UNCONFIRMED"]).defaultTo("UNCONFIRMED").notNullable();

            //Profile URL length: 2048 is a standard safe maximum for URLs
            table.string("profile_picture", 2048).nullable();

            table.timestamps(true, true);
        })
        .createTable("token_table", (table) => {
            table.increments("id").primary();
            table.string("confirmation_code", 6).notNullable();
            table.integer("user_id").unsigned().notNullable()
                .references("id").inTable("users").onDelete("CASCADE");
            table.timestamp("expires_at").notNullable();

            // Strict length check for exactly 6 digits
            table.check("length(confirmation_code) = 6", [], "token_should_be_6_digit_long");
        })
        .createTable("user_sessions", (table) => {
            table.increments("id").primary();
            table.integer("user_id").unsigned().notNullable()
                .references("id").inTable("users").onDelete("CASCADE");
            table.string("refresh_token", 512).notNullable();
            table.timestamp("expires_at").notNullable();
        });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema
        .dropTableIfExists("user_sessions")
        .dropTableIfExists("token_table")
        .dropTableIfExists("users");
}