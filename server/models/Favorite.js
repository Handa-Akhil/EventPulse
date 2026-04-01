import { DataTypes } from "sequelize";
import { sequelize } from "../db/sequelize.js";

export const Favorite = sequelize.define(
  "Favorite",
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
  },
  {
    tableName: "favorites",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);
