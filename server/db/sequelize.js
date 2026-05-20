import { Sequelize } from "sequelize";
import { config } from "../config.js";
import { getSequelizeOptions } from "./connectionOptions.js";

export const sequelize = new Sequelize(
  config.db.name,
  config.db.user,
  config.db.password,
  getSequelizeOptions(),
);
