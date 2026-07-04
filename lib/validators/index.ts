/**
 * Barrel module for all Zod validators and related TypeScript types in the
 * German e-commerce and booking domain. Re-exporting from here gives forms,
 * server actions, and API handlers one stable import path without runtime side
 * effects.
 */
// Barrel export for all Zod validators
export * from './adresse';
export * from './artikel';
export * from './bestellung';
export * from './buchung';
export * from './firmeneinstellungen';
export * from './rechtstext';
