import { sequelize } from "../db/sequelize.js";
import { User } from "./User.js";
import { Event } from "./Event.js";
import { Booking } from "./Booking.js";

User.hasMany(Booking, { foreignKey: "user_id", as: "bookings" });
Booking.belongsTo(User, { foreignKey: "user_id", as: "user" });

Event.hasMany(Booking, { foreignKey: "event_id", as: "bookings" });
Booking.belongsTo(Event, { foreignKey: "event_id", as: "event" });

export { sequelize, User, Event, Booking };