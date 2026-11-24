import { relations } from 'drizzle-orm';
import {
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Authenticated trainers linked by Firebase Auth UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull(),
  usernameKey: text('username_key').notNull(),
  favoriteClubId: text('favorite_club_id').notNull().default('fla'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relational cloud career saves (autosave + 5 career slots per trainer)
export const careerSaves = pgTable(
  'career_saves',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    slotId: text('slot_id').notNull(),
    clubId: text('club_id').notNull(),
    clubName: text('club_name').notNull(),
    clubShortName: text('club_short_name').notNull(),
    clubPrimaryColor: text('club_primary_color').notNull().default('#10b981'),
    clubSecondaryColor: text('club_secondary_color').notNull().default('#0f172a'),
    division: text('division').notNull().default('A'),
    managerName: text('manager_name').notNull(),
    seasonYear: integer('season_year').notNull().default(2026),
    round: integer('round').notNull().default(1),
    currentDate: text('current_date').notNull().default('2026-01-11'),
    clubBalance: doublePrecision('club_balance').notNull().default(0),
    payloadCompressed: text('payload_compressed').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('career_saves_user_slot_idx').on(table.userId, table.slotId)]
);

// Relational Hall of Fame & career milestone snapshots per trainer slot
export const hallOfFameEntries = pgTable(
  'hall_of_fame_entries',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    slotId: text('slot_id').notNull(),
    managerName: text('manager_name').notNull(),
    clubId: text('club_id').notNull(),
    clubName: text('club_name').notNull(),
    seasonYear: integer('season_year').notNull().default(2026),
    trophiesCount: integer('trophies_count').notNull().default(0),
    hallOfFamePoints: integer('hall_of_fame_points').notNull().default(0),
    winRatePct: integer('win_rate_pct').notNull().default(0),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('hall_of_fame_user_slot_idx').on(table.userId, table.slotId)]
);

export const usersRelations = relations(users, ({ many }) => ({
  careerSaves: many(careerSaves),
  hallOfFameEntries: many(hallOfFameEntries),
}));

export const careerSavesRelations = relations(careerSaves, ({ one }) => ({
  owner: one(users, {
    fields: [careerSaves.userId],
    references: [users.id],
  }),
}));

export const hallOfFameEntriesRelations = relations(hallOfFameEntries, ({ one }) => ({
  owner: one(users, {
    fields: [hallOfFameEntries.userId],
    references: [users.id],
  }),
}));
