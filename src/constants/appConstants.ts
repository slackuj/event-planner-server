export const SALT_ROUNDS = 17;

const currentYear = new Date().getFullYear();

// Jan 1 of current year at local 00:00:00
export const DEFAULT_START_DATE = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0)).getTime();

// Dec 31 of current year at local 23:59:59
export const DEFAULT_END_DATE = new Date(currentYear, 11, 31, 23, 59, 59, 999).getTime();