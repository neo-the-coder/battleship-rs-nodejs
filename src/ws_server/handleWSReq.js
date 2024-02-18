import { DB } from "../db/db.js";
import { createPlayer } from "../models/Player.js";

export const handlePlayerRegistration = (ws, playerData) => {
  const newPlayer = createPlayer(playerData.data.name);

  const output = JSON.stringify({
    ...playerData,
    data: JSON.stringify(newPlayer),
  });

  if (!newPlayer.error) {
    DB.players.push(newPlayer);
    ws.id = {
      name: newPlayer.name,
      index: newPlayer.index,
    };
  }

  return output;
};

export const handleRoomUpdate = (roomId, { name, index }) => {
  return JSON.stringify({
    type: "update_room",
    data: [
      JSON.stringify({
        roomId,
        roomUsers: [
          JSON.stringify({
            name,
            index,
          }),
        ],
      }),
    ],
    id: 0,
  });
};

export const handleCreateGame = (playerData) => {
  const roomId = "RM" + Date.now();
  DB.rooms.push({roomId, roomUsers: playerData});
  return handleRoomUpdate(roomId, playerData);
};

export const handleJoin = (roomId) => {
  
}