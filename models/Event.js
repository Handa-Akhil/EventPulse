import { DataTypes } from "sequelize";
import { sequelize } from "../../server/db/sequelize.js";

export const Event = sequelize.define(
  "Event",
  {
    id: {
      type: DataTypes.STRING(80),
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    venue: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false,
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false,
    },
    price: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    total_seats: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
    },
    remaining_seats: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
    },
    event_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    date_label: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    duration: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    language: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    audience: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    hero_gradient: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    short_description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    highlights_json: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },
    showtimes_json: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },
  },
  {
    tableName: "events",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
