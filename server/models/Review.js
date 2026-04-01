import { DataTypes } from "sequelize";
import { sequelize } from "../db/sequelize.js";

export const Review = sequelize.define(
  "Review",
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
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    user_name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
  },
  {
    tableName: "reviews",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);
