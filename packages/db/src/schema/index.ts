// We must export all the tables from the database, export * as default
/** biome-ignore-all lint/performance/noBarrelFile: Need a barrel file for the schemas */

export * from './tables/auth.db';
export * from './tables/dictation.db';
export * from './tables/dictionary.db';
export * from './tables/usage.db';
