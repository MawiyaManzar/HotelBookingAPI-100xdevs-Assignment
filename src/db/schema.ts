import { email, string } from "zod";
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  integer,
  decimal,
  jsonb,
  pgEnum,
  unique,
  check,
} from "drizzle-orm/pg-core";

import { relations, sql } from "drizzle-orm";
import { password } from "bun";

export const roleEnums = pgEnum("user_role",["customer","owner"])

export const bookingStatusEnum=pgEnum("booking_status",["confirmed","cancelled"])

/* ------------------ USERS ------------------ */

export const users = pgTable("users",{
    id:uuid().defaultRandom().primaryKey(),
    name:varchar({length:255}).notNull(),
    email:varchar({length:255}).notNull().unique(),
    password:varchar({length:255}).notNull(),
    role:roleEnums().notNull(),
    phone:varchar({length:20}),
    createdAt:timestamp({withTimezone:false}).defaultNow().notNull()
})

export const hotels =pgTable("hotels",{
    id:uuid().defaultRandom().primaryKey(),
    ownerId:uuid().notNull().references(()=>users.id , {onDelete:'cascade'}),
    name:varchar({length:255}).notNull(),
    description:text(),
    city:varchar({length:100}).notNull(),
    country:varchar({length:100}).notNull(),
    amenities:jsonb().default([]),
    ratings:decimal({precision:2,scale:1}).default("0.0"),
    totalreviews:integer().default(0),
    createdAt:timestamp({withTimezone:false}).notNull().defaultNow()


})

/* ------------------ ROOMS ------------------ */

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    hotelId: uuid("hotel_id")
      .notNull()
      .references(() => hotels.id, { onDelete: "cascade" }),
    roomNumber: varchar("room_number", { length: 50 }).notNull(),
    roomType: varchar("room_type", { length: 100 }).notNull(),
    pricePerNight: decimal("price_per_night", {
      precision: 10,
      scale: 2,
    }).notNull(),
    maxOccupancy: integer("max_occupancy").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  }
);

export const uniqueRoom = unique("unique_room").on(rooms.hotelId, rooms.roomNumber);

/* ------------------ BOOKINGS ------------------ */

export const bookings = pgTable(
  "bookings",
  { id: uuid().defaultRandom().primaryKey(),
    userId: uuid().notNull().references(() => users.id),
    roomId: uuid().notNull().references(() => rooms.id),
    hotelId: uuid().notNull().references(() => hotels.id),
    checkInDate: date().notNull(),
    checkOutDate: date().notNull(),
    guests: integer().notNull(),
    totalPrice: decimal({precision: 10,scale: 2,}).notNull(),
    status: bookingStatusEnum().default("confirmed").notNull(),
    bookingDate: timestamp().defaultNow().notNull(),
    cancelledAt: timestamp(),
  }
);

export const dateCheck = check(
  "check_booking_dates",
  sql`${bookings.checkOutDate} > ${bookings.checkInDate}`
);

/* ------------------ REVIEWS ------------------ */

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    hotelId: uuid("hotel_id")
      .notNull()
      .references(() => hotels.id),

    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id),

    rating: integer("rating").notNull(),

    comment: text("comment"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  }
);

export const uniqueReview = unique("unique_review").on(reviews.userId, reviews.bookingId);

export const ratingCheck = check(
  "rating_between_1_and_5",
  sql`${reviews.rating} >= 1 AND ${reviews.rating} <= 5`
);

export const usersRelations = relations(users, ({ many }) => ({
  hotels: many(hotels),
  bookings: many(bookings),
  reviews: many(reviews),
}));

export const hotelsRelations = relations(hotels, ({ one, many }) => ({
  owner: one(users, {
    fields: [hotels.ownerId],
    references: [users.id],
  }),
  rooms: many(rooms),
  bookings: many(bookings),
  reviews: many(reviews),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  hotel: one(hotels, {
    fields: [rooms.hotelId],
    references: [hotels.id],
  }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),

  room: one(rooms, {
    fields: [bookings.roomId],
    references: [rooms.id],
  }),

  hotel: one(hotels, {
    fields: [bookings.hotelId],
    references: [hotels.id],
  }),

  review: one(reviews, {
    fields: [bookings.id],
    references: [reviews.bookingId],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),

  hotel: one(hotels, {
    fields: [reviews.hotelId],
    references: [hotels.id],
  }),

  booking: one(bookings, {
    fields: [reviews.bookingId],
    references: [bookings.id],
  }),
}));