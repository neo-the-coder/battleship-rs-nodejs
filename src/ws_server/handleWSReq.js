import { DB } from "../db/db.js";
import { createPlayer } from "../models/Player.js";
import { getIndex } from "../utils/generateIndex.js";

const handleRoomUpdate = () => {
  return JSON.stringify({
    type: "update_room",
    data: JSON.stringify(DB.rooms),
    id: 0,
  });
};

export const handleCreateRoom = (wss) => {
  const roomId = getIndex("200");
  DB.rooms.push({ roomId, roomUsers: [] });
  const newRoom = handleRoomUpdate();
  wss.clients.forEach((client) => client.send(newRoom));
};

const handleWinners = () => {
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

export const handlePlayerRegistration = (wss, ws, name) => {
  const newPlayer = createPlayer(name);

  // add to the DB if the username is unique
  if (!newPlayer.error) {
    const playerInfo = {
      name: newPlayer.name,
      index: newPlayer.index,
    };
    DB.players.push(playerInfo);
    ws.id = playerInfo;
  }

  ws.send(
    JSON.stringify({
      type: "reg",
      data: JSON.stringify(newPlayer),
    })
  );

  wss.clients.forEach((client) => {
    client.send(handleRoomUpdate());
    client.send(handleWinners());
  });
};

const handleCreateGame = (wss) => {
  const idGame = getIndex("300");

  wss.clients.forEach((client) => {
    client.send(
      JSON.stringify({
        type: "create_game",
        data: JSON.stringify({
          idGame,
          idPlayer: client.id.index,
        }),
        id: 0,
      })
    );
  });
};

export const handleUserJoin = (wss, player, roomId) => {
  const targetRoom = DB.rooms.find((room) => room.roomId === roomId);

  if (targetRoom) {
    const alreadyJoined = targetRoom.roomUsers.some(
      (user) => user.index === player.index
    );

    if (!alreadyJoined) {
      targetRoom.roomUsers.push(player);
    }
  }
  wss.clients.forEach((client) => client.send(handleRoomUpdate()));

  if (targetRoom.roomUsers.length === 2) {
    // Remove room from the list of available
    DB.rooms = DB.rooms.filter((room) => room.roomId !== targetRoom.roomId);
    // Create the game session
    handleCreateGame(wss);
  }
};

export const handleGameStart = (wss, { gameId, ships, indexPlayer }) => {
  // When some player already added ships
  if (DB.openGames[gameId]) {
    // while second player haven't added ships
    if (!DB.openGames[gameId][indexPlayer]) {
      DB.openGames[gameId][indexPlayer] = ships;
      wss.clients.forEach((client) => {
        client.send(
          JSON.stringify({
            type: "start_game",
            data: JSON.stringify({
              ships: DB.openGames[gameId][client.id.index],
              currentPlayerIndex: client.id.index,
            }),
          })
        );
      });
    }
    // When no player added ships
  } else {
    DB.openGames[gameId] = {
      [indexPlayer]: ships,
    };
  }
};
