import { DataTypes } from "sequelize";
import { sequelize } from "../db/sequelize.js";

export const Booking = sequelize.define(
  "Booking",
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    event_id: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    venue: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    date_label: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    slot: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    total: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "bookings",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  },
);
