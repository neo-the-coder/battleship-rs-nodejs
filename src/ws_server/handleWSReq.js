import { WebSocket } from "ws";
import { DB } from "../db/db.js";
import { createPlayer } from "../models/Player.js";
import { getIndex } from "../utils/generateIndex.js";
import { getBotShips } from "../utils/getBotShips.js";
import { getPriorityCells } from "../utils/getPriorityCells.js";

const handleRoomUpdate = () => {
  return JSON.stringify({
    type: "update_room",
    data: JSON.stringify(DB.rooms),
    id: 0,
  });
};

export const handleCreateRoom = (wss, host) => {
  const roomId = getIndex("200");
  DB.rooms.push({ roomId, roomUsers: [host] });
  const newRoom = handleRoomUpdate();
  wss.clients.forEach((client) => client.send(newRoom));
};

const handleWinners = () => {
  const winners = DB.players
    .filter((player) => player.wins)
    .map((player) => ({
      name: player.name,
      wins: player.wins,
    }));
  return JSON.stringify({
    type: "update_winners",
    data: JSON.stringify(winners),
    id: 0,
  });
};

export const handlePlayerRegistration = (wss, ws, credentials) => {
  const newPlayer = createPlayer(credentials);

  // add to the DB if the username is unique
  if (!newPlayer.error) {
    const playerInfo = {
      name: newPlayer.name,
      password: credentials.password,
      index: newPlayer.index,
      client: ws
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

  wss.clients.forEach((client, i) => {
    console.log('sent only to some', client.id)
    if (i % 2 === 0) {

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

const handleTurn = (currentPlayer) => {
  return JSON.stringify({
    type: "turn",
    data: JSON.stringify({
      currentPlayer,
    }),
    id: 0,
  });
};

export const handleGameStart = (wss, { gameId, ships, indexPlayer }) => {
  // When some player already added ships
  if (DB.openGames[gameId]) {
    // while second player haven't added ships
    if (!DB.openGames[gameId].players[indexPlayer]) {
      DB.openGames[gameId].players[indexPlayer] = {
        ships,
        shots: new Set(),
      };
      // Determine first player randomly
      const currentPlayer = +Object.keys(DB.openGames[gameId].players)[
        Math.floor(Math.random() * 2)
      ];
      DB.openGames[gameId].currentPlayer = currentPlayer;

      wss.clients.forEach((client) => {
        client.send(
          JSON.stringify({
            type: "start_game",
            data: JSON.stringify({
              ships: DB.openGames[gameId].players[client.id.index].ships,
              currentPlayerIndex: client.id.index,
            }),
          })
        );
        // Start with randomly selected player
        client.send(handleTurn(currentPlayer));
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
      }
    };
  }
};

const handleGameFinish = (winPlayer) => {
  return JSON.stringify({
    type: "finish",
    data: JSON.stringify({
      winPlayer,
    }),
    id: 0,
  });
};

const handleCellsAround = (wss, indexPlayer, shots, direction, x, y, shipLength) => {
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

      wss.clients.forEach(client => client.send(
        JSON.stringify({
          type: "attack",
          data: JSON.stringify({
            position: {
              x: +coordinate[0],
              y: +coordinate[1],
            },
            currentPlayer: indexPlayer,
            status,
          }),
          id: 0,
        })
      ))
    }
  }
};

export const handleAttack = (wss, { gameId, x, y, indexPlayer }) => {
  const indexEnemy = +Object.keys(DB.openGames[gameId].players).find((player) => +player !== indexPlayer);
  console.log("WHO's THE ENEMY AND PLAYERS?", indexEnemy, DB.openGames[gameId].players)
  const ships = DB.openGames[gameId].players[indexEnemy].ships;
  const shots = DB.openGames[gameId].players[indexPlayer].shots;
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
        if (ship.length === 1 || ship.hits?.length === ship.length - 1 ) {
          status = "killed";
          // send killed for each block + missed around
          handleCellsAround(wss, indexPlayer, shots, ship.direction, ship.position.x, ship.position.y, ship.length)
          // remove ship from enemy's available list
          ships.splice(ships.indexOf(ship), 1);
        } else {
          status = "shot";
          // create empty hits array if not exists
          ship.hits ??= [];
          // add hit to the array and sort it
          ship.hits.push(coordinates)
          ship.hits.sort();
          shots.add(coordinates);
          // calculate priority cells
          getPriorityCells(ship, shots, coordinates);
        }
        break;
      }
      // ship missed
      if (ship.priorityCells?.includes(coordinates)) {
        ship.priorityCells = ship.priorityCells.filter(coord => coord !== coordinates);
      }
    }

    shots.add(coordinates);

    if (ships.length === 0) {
      delete DB.openGames[gameId];
      const winner = DB.players.find(
        (player) => player.index === indexPlayer
      );
      winner.wins = (winner.wins ?? 0) + 1;
    }

    wss.clients.forEach(client => {
      // All enemy ships destroyed
      if (ships.length === 0) {
        client.send(handleGameFinish(indexPlayer));
        client.send(handleWinners());
        client.send(handleRoomUpdate());
        return;
      }

      if (status !== "killed") {
        client.send(
          JSON.stringify({
            type: "attack",
            data: JSON.stringify({
              position: {
                x,
                y,
              },
              currentPlayer: indexPlayer,
              status,
            }),
            id: 0,
          })
        );
      }

      // Switch player turn
      client.send(handleTurn(status === "miss" ? indexEnemy : indexPlayer));
    })

    // Change current player in DB
    if (status === "miss") {
      DB.openGames[gameId].currentPlayer = indexEnemy;
    }
  }
};

export const handleRandomAttack = (wss, { gameId, indexPlayer }) => {
  if (indexPlayer === DB.openGames[gameId].currentPlayer) {
    // see if there are any priority cells to check first
    const indexEnemy = +Object.keys(DB.openGames[gameId].players).find(
      (player) => +player !== indexPlayer
    );
    const priorityMoves = DB.openGames[gameId].players[
      indexEnemy
    ].ships.flatMap((ship) => ship.priorityCells ?? []);

    let x, y;
    if (priorityMoves.length > 0) {
      const priorityRandomMove =
        priorityMoves[Math.floor(Math.random() * priorityMoves.length)];
      
        console.log('random from priproty:', priorityRandomMove)
      x = Number(priorityRandomMove[0]);
      y = Number(priorityRandomMove[1]);
    } else {
      // Randomly attack enemy
      const playedMoves = Array.from(
        DB.openGames[gameId].players[indexPlayer].shots
      );
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

// export const handleSinglePlay = (wss, player) => {
// // Create a new Web Socket Bot client
// const botSocket = new WebSocket('ws://localhost:3000/');

// if (CLIENTS.length === 0) {
//   ws.id = {
//     name: "SmartBot",
//     index: 7777777
//   }
// }

// botSocket.on('message', (message) => {
//   const data = JSON.parse(message.toString())
//   if (data.data.includes('"')) {
//     data.data = JSON.parse(data.data);
//   }
  
//   console.log('BOT RECEIVED A MESSAGE', data.type)
//   if (data.type === "create_game") {

//   }

//   if (data.type === "turn") {
//     handleRandomAttack = (wss, { gameId, 7777777 })
//   }

// })


//   const gameId = handleCreateGame(wss);

//   DB.openGames[gameId] = {
//     players: {
//       [player.index]: {
//         shots: new Set(),
//       },
//       "7777777": {
//         ships: getBotShips(),
//         shots: new Set(),
//       }
//     },
//     currentPlayer: player.index,
//   };
// }