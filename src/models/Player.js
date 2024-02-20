import { DB } from "../db/db.js";
import { getIndex } from "../utils/generateIndex.js";

export const createPlayer = (name) => {
  const playerExists = Boolean(
    DB.players.find((player) => player.name === name)
  );
  const index = getIndex("100");
  return {
    name,
    index,
    error: playerExists,
    errorText: playerExists ? "Username already taken!" : "",
  };
};
