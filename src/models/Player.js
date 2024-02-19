import { DB } from "../db/db.js";

export const createPlayer = (name) => {
  const playerExists = Boolean(
    DB.players.find((player) => player.name === name)
  );
  const index = Number("100" + Math.floor(Math.random() * 10000));
  return {
    name,
    index,
    error: playerExists,
    errorText: playerExists ? "Username already taken!" : "",
  };
};
