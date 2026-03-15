import { DataTypes } from "sequelize";
import { sequelize } from "../../server/db/sequelize.js";

export const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    preferences_json: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
      defaultValue: "[]",
    },
    saved_location_json: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    has_onboarded: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "users",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
