import { DB } from "../db/db.js";
import { getIndex } from "../utils/generateIndex.js";

export const createPlayer = ({ name, password }) => {
  const existingUser = DB.players.find((player) => player.name === name);
  const error = existingUser && existingUser.password !== password;
  const index = getIndex("100");

  return [{
    name,
    index,
    error,
    errorText: error ? "Wrong password!" : "",
  }, existingUser];
};
