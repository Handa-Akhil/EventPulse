import { DataTypes } from "sequelize";
import { sequelize } from "../db/sequelize.js";

export const Notification = sequelize.define(
  "Notification",
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "info",
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "notifications",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);
