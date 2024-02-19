import { DB } from "../db/db.js";
import { createPlayer } from "../models/Player.js";

export const handlePlayerRegistration = (ws, name) => {
  const newPlayer = createPlayer(name);

  if (!newPlayer.error) {
    const playerInfo = {
      name: newPlayer.name,
      index: newPlayer.index,
    };
    DB.players.push(playerInfo);
    ws.id = playerInfo;
  }

  return JSON.stringify({
    type: "reg",
    data: JSON.stringify(newPlayer),
  });
};

export const handleRoomUpdate = () => {
  return JSON.stringify({
    type: "update_room",
    data: JSON.stringify(DB.rooms),
    id: 0,
  });
};

export const handleCreateRoom = (playerData) => {
  const roomId = Number("200" + Math.floor(Math.random() * 10000));
  // include playerData below to add user to room
  DB.rooms.push({ roomId, roomUsers: [] });
  return handleRoomUpdate();
};

export const handleWinners = () => {
  return JSON.stringify({
    type: "update_winners",
    data: JSON.stringify(
      DB.players.some((player) => player.wins)
        ? DB.players.map((player) => ({
            name: player.name,
            wins: player.wins,
          }))
        : []
    ),
    id: 0,
  });
};

const handleCreateGame = (idPlayer) => {
  const idGame = Number("300" + Math.floor(Math.random() * 10000));
  return JSON.stringify({
    type: "create_game",
    data: JSON.stringify({
      idGame,
      idPlayer,
    }),
    id: 0,
  });
};

export const handleUserJoin = (wss, ws, roomId) => {
  const targetRoom = DB.rooms.find((room) => room.roomId === roomId);

  if (targetRoom) {
    const alreadyJoined = targetRoom.roomUsers.some(
      (user) => user.index === ws.id.index
    );

    if (!alreadyJoined) {
      targetRoom.roomUsers.push(ws.id);
    }
  }
  ws.send(handleRoomUpdate());
  // Create the game session
  if (targetRoom.roomUsers.length === 2) {
    const startGame = handleCreateGame(ws.id.index);
    wss.clients.forEach((client) => {
      client.send(startGame);
    });
  }
};
