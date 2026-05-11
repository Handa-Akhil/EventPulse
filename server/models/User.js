import { DataTypes } from "sequelize";
import { sequelize } from "../db/sequelize.js";

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
    password_reset_otp_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    password_reset_otp_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
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
