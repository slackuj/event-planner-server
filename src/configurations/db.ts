import knex from 'knex';
// @ts-ignore
import knexConfig from "../../knexfile";

export const database = knex(knexConfig.development);