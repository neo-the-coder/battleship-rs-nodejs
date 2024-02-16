import { DB } from "../db/players.js";
import { PlayerModel } from "../models/Player.js";

export const handlePlayerRegistration = (playerData) => {
  const playerModel = new PlayerModel(playerData.data.name);
  DB.players.push(playerModel);
  return JSON.stringify({
    ...playerData,
    data: JSON.stringify(playerModel)
  })
};

export const handleCreateGame = (roomName) => {

};
