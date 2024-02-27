import { WebSocket } from "ws";
import { DB } from "../db/db.js";
import { createPlayer } from "../models/Player.js";
import { getIndex } from "../utils/generateIndex.js";
import { getBotShips } from "../utils/getBotShips.js";
import { getPriorityCells } from "../utils/getPriorityCells.js";
import { createResponse } from "../utils/createResponse.js";

const handleRoomUpdate = () => createResponse("update_room", DB.rooms);

const handleWinners = () => {
  const winners = DB.players
    .filter((player) => player.wins)
    .map((player) => ({
      name: player.name,
      wins: player.wins,
    }));
  return createResponse("update_winners", winners);
};

export const handlePlayerRegistration = (wss, client, credentials) => {
  const [newPlayer, existingUser] = createPlayer(credentials);

  // add to the DB if the user registered
  if (!existingUser) {
    const playerInfo = {
      name: newPlayer.name,
      // password: credentials.password,
      index: newPlayer.index,
    };
    DB.players.push({ ...playerInfo, password: credentials.password });
    client.id = playerInfo;
  } else {
    client.id = existingUser;
  }

  client.send(createResponse("reg", newPlayer));

  wss.clients.forEach((client) => {
    client.send(handleRoomUpdate());
    client.send(handleWinners());
  });
};

export const handleCreateRoom = (wss, host) => {
  const hostedAlready = DB.rooms.find((room) =>
    room.roomUsers.some((user) => user.index === host.index)
  );
  // Restrict one room per host
  if (!hostedAlready) {
    // Generate a new room id
    const roomId = getIndex("200");
    // add host to a newly created room
    DB.rooms.push({ roomId, roomUsers: [host] });
    // update room info for all clients
    const newRoom = handleRoomUpdate();
    wss.clients.forEach((client) => client.send(newRoom));
    return roomId;
  }
};

const handleCreateGame = (wss, sessionPlayers) => {
  // Generate a new game id
  const idGame = getIndex("300");

  wss.clients.forEach((client) => {
    if (sessionPlayers.includes(client.id.index)) {
      const data = {
        idGame,
        idPlayer: client.id.index,
      };
      client.send(createResponse("create_game", data));
    }
  });

  return idGame;
};

export const handleUserJoin = (wss, player, roomId) => {
  const targetRoom = DB.rooms.find((room) => room.roomId === roomId);

  if (targetRoom) {
    const alreadyJoined = targetRoom.roomUsers.some(
      (user) => user.index === player.index
    );
    // avoid to join room if already joined
    if (!alreadyJoined) {
      targetRoom.roomUsers.push(player);
    }
  }

  if (targetRoom.roomUsers.length === 2) {
    const sessionPlayers = targetRoom.roomUsers.map((user) => user.index);
    // Remove rooms where host is one of the session players
    DB.rooms = DB.rooms.filter((room) =>
      room.roomUsers.some((user) => !sessionPlayers.includes(user.index))
    );

    // Create the game session
    return handleCreateGame(wss, sessionPlayers);
  }

  wss.clients.forEach((client) => client.send(handleRoomUpdate()));
};

const handleTurn = (currentPlayer) => createResponse("turn", { currentPlayer });

export const handleGameStart = (wss, { gameId, ships, indexPlayer }) => {
  // When first player already added ships
  if (DB.openGames[gameId]) {
    // Avoid adding ships multiple times
    if (!DB.openGames[gameId].players[indexPlayer]) {
      DB.openGames[gameId].players[indexPlayer] = {
        ships,
        shots: new Set(),
      };
      const sessionPlayers = Object.keys(DB.openGames[gameId].players).map(
        (index) => +index
      );
      // Determine first player randomly
      const currentPlayer = sessionPlayers[Math.floor(Math.random() * 2)];
      DB.openGames[gameId].currentPlayer = currentPlayer;

      wss.clients.forEach((client) => {
        if (sessionPlayers.includes(client.id.index)) {
          const data = {
            ships: DB.openGames[gameId].players[client.id.index].ships,
            currentPlayerIndex: client.id.index,
          };

          client.send(createResponse("start_game", data));
          // Start with randomly selected player
          client.send(handleTurn(currentPlayer));
        }
      });
    } else {
      // for single play case
      // DB.openGames[gameId].players[indexPlayer].ships = ships;
      // console.log("IM IN SINGLE PLAY")
      // wss.clients.forEach((client) => {
      //   if (client.id.index === indexPlayer) {
      //     client.send(
      //       JSON.stringify({
      //         type: "start_game",
      //         data: JSON.stringify({
      //           ships: DB.openGames[gameId].players[client.id.index].ships,
      //           currentPlayerIndex: client.id.index,
      //         }),
      //       })
      //     )
      //   }
      // });
    }
    // When no player added ships
  } else {
    DB.openGames[gameId] = {
      players: {
        [indexPlayer]: {
          ships,
          shots: new Set(),
        },
      },
    };
  }
};

const handleGameFinish = (winPlayer) => createResponse("finish", { winPlayer });

const handleCellsAround = (
  wss,
  sessionPlayers,
  indexPlayer,
  shots,
  direction,
  x,
  y,
  shipLength
) => {
  const [shortLoop, longLoop] = direction ? [x, y] : [y, x];
  for (let i = -1 + shortLoop; i <= 1 + shortLoop; i++) {
    // out of board boundary
    if (i < 0 || i >= 10) continue;
    for (let j = -1 + longLoop; j <= shipLength + longLoop; j++) {
      // out of board boundary
      if (j < 0 || j >= 10) continue;
      const status =
        i === shortLoop && j >= longLoop && j < shipLength + longLoop
          ? "killed"
          : "miss";
      const coordinate = `${direction ? i : j}${direction ? j : i}`;
      shots.add(coordinate);
      // console.log(status, coordinate);

      wss.clients.forEach((client) => {
        if (sessionPlayers.includes(client.id.index)) {
          const data = {
            position: {
              x: +coordinate[0],
              y: +coordinate[1],
            },
            currentPlayer: indexPlayer,
            status,
          };
          client.send(createResponse("attack", data));
        }
      });
    }
  }
};

export const handleAttack = (wss, { gameId, x, y, indexPlayer }) => {
  const gameSession = DB.openGames[gameId];
  const sessionPlayers = Object.keys(gameSession.players).map(
    (index) => +index
  );
  const indexEnemy = sessionPlayers.find((player) => player !== indexPlayer);
  const ships = gameSession.players[indexEnemy].ships;
  const shots = gameSession.players[indexPlayer].shots;
  const coordinates = `${x}${y}`;

  // if coordinate was not hit before OR
  // because of a bug in the front x or y is -1 don't proceed
  if (!shots.has(coordinates) && x !== -1 && y !== -1) {
    let status = "miss";

    for (const ship of ships) {
      // console.log(":>:>", ship);
      const isHit = ship.direction
        ? x === ship.position.x &&
          y >= ship.position.y &&
          y < ship.position.y + ship.length
        : y === ship.position.y &&
          x >= ship.position.x &&
          x < ship.position.x + ship.length;

      if (isHit) {
        // one block left to destroy
        if (ship.length === 1 || ship.hits?.length === ship.length - 1) {
          status = "killed";
          // send killed for each block + missed around
          handleCellsAround(
            wss,
            sessionPlayers,
            indexPlayer,
            shots,
            ship.direction,
            ship.position.x,
            ship.position.y,
            ship.length
          );
          // remove ship from enemy's available list
          ships.splice(ships.indexOf(ship), 1);
        } else {
          status = "shot";
          // create empty hits array if not exists
          ship.hits ??= [];
          // add hit to the array and sort it
          ship.hits.push(coordinates);
          ship.hits.sort();
          shots.add(coordinates);
          // calculate priority cells
          getPriorityCells(ship, shots, coordinates);
        }
        break;
      }
      // ship missed
      if (ship.priorityCells?.includes(coordinates)) {
        ship.priorityCells = ship.priorityCells.filter(
          (coord) => coord !== coordinates
        );
      }
    }

    shots.add(coordinates);
    // All enemy ships destroyed
    if (ships.length === 0) {
      // delete game session
      delete DB.openGames[gameId];
      // determine winner and increment win
      const winner = DB.players.find((player) => player.index === indexPlayer);
      winner.wins = (winner.wins ?? 0) + 1;

      wss.clients.forEach((client) => {
        if (sessionPlayers.includes(client.id.index)) {
          client.send(handleGameFinish(indexPlayer));
        }
        client.send(handleWinners());
        client.send(handleRoomUpdate());
      });
    } else {
      wss.clients.forEach((client) => {
        if (sessionPlayers.includes(client.id.index)) {
          if (status !== "killed") {
            const data = {
              position: {
                x,
                y,
              },
              currentPlayer: indexPlayer,
              status,
            };
            client.send(createResponse("attack", data));
          }
          // Switch player turn
          client.send(handleTurn(status === "miss" ? indexEnemy : indexPlayer));
        }
      });

      // Change current player in DB
      if (status === "miss") {
        DB.openGames[gameId].currentPlayer = indexEnemy;
      }
    }
  }
};

export const handleRandomAttack = (wss, { gameId, indexPlayer }) => {
  const gameSession = DB.openGames[gameId];
  if (indexPlayer === gameSession.currentPlayer) {
    // see if there are any priority cells to check first
    const indexEnemy = +Object.keys(gameSession.players).find(
      (player) => +player !== indexPlayer
    );
    const priorityMoves = gameSession.players[indexEnemy].ships.flatMap(
      (ship) => ship.priorityCells ?? []
    );

    let x, y;
    if (priorityMoves.length > 0) {
      const priorityRandomMove =
        priorityMoves[Math.floor(Math.random() * priorityMoves.length)];

      console.log("random from priproty:", priorityRandomMove);
      x = Number(priorityRandomMove[0]);
      y = Number(priorityRandomMove[1]);
    } else {
      // Randomly attack enemy
      const playedMoves = Array.from(gameSession.players[indexPlayer].shots);
      const playableMoves = DB.possibleMoves.filter(
        (move) => !playedMoves.includes(move)
      );
      const playableMove =
        playableMoves[Math.floor(Math.random() * playableMoves.length)];
      x = Number(playableMove[0]);
      y = Number(playableMove[1]);
    }

    console.log("Got randomly: ", x, y);
    handleAttack(wss, { gameId, x, y, indexPlayer });
  }
};

export const handleSinglePlay = (wss, client) => {
  // Create a new Web Socket Bot client
  const botSocket = new WebSocket("ws://localhost:3000/");
  let botData = {};

  botSocket.on("message", (messageJSON) => {
    const msg = JSON.parse(messageJSON.toString());
    if (msg.data.includes('"')) {
      msg.data = JSON.parse(msg.data);
    }
    const { type, data } = msg;
    console.log("BOT received", msg);

    if (type === "bot_id") {
      // Create temporary room
      const roomId = handleCreateRoom(wss, data);
      // Add client to the room
      const gameId = handleUserJoin(wss, client, roomId);
      // Add bot ships to its board
      const shipData = {
        gameId,
        ships: getBotShips(),
        indexPlayer: data.index,
      };

      botData.gameId = gameId;
      botData.indexPlayer = data.index;

      botSocket.send(createResponse("add_ships", shipData));
    }

    if (type === "turn") {
      const { gameId, indexPlayer } = botData;
      handleRandomAttack(wss, { gameId, indexPlayer });
    }
  });

  botSocket.on("close", () => {
    console.log("Bot disconnected from server");
  });
};

export const handleBot = (botClient) => {
  botClient.id = {
    name: `Smart_Bot${Math.floor(100 + Math.random() * 900)
      .toString()
      .padStart(2, "0")}`,
    index: getIndex("777"),
  };

  DB.players.push(botClient.id);

  botClient.send(createResponse("bot_id", botClient.id));
};
