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

const getProbableCells = (highProb, shots, x, y) => {
  // did not hit with random before
  if (!highProb) {
    highProb = {
      cells: [],
      firstRandomHit: `${x}${y}`
    }
    for (let newX of [x-1, x+1]) {
      const coord = `${newX}${y}`;
      if (!shots.has(coord) && newX >= 0 && newX < 10) highProb.cells.push(coord);
    }
    for (let newY of [y-1, y+1]) {
      const coord = `${x}${newY}`;
      if (!shots.has(coord) && newY >= 0 && newY < 10) highProb.cells.push(coord);
    }
  } else {

  }
  

}

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

export const handleAttack = (wss, { gameId, x, y, indexPlayer }, isRandomShot = false) => {
  const indexEnemy = +Object.keys(DB.openGames[gameId].players).find((player) => +player !== indexPlayer);
  const ships = DB.openGames[gameId].players[indexEnemy].ships;
  const shots = DB.openGames[gameId].players[indexPlayer].shots;
  const coordinates = `${x}${y}`;

  // if coordinate was not hit before
  if (!shots.has(coordinates)) {
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
        if (ship.hit === ship.length - 1 || ship.length === 1) {
          status = "killed";
          // send killed for each block + missed around
          handleCellsAround(wss, indexPlayer, shots, ship.direction, ship.position.x, ship.position.y, ship.length)
          // remove ship from enemy's available list
          ships.splice(ships.indexOf(ship), 1);
        } else {
          status = "shot";
          ship.hit = (ship.hit ?? 0) + 1;
          if (isRandomShot) {

          }
        }
        break;
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
    const playedMoves = Array.from(
      DB.openGames[gameId].players[indexPlayer].shots
    );
    const playableMoves = DB.possibleMoves.filter(
      (move) => !playedMoves.includes(move)
    );
    const [x, y] =
      playableMoves[Math.floor(Math.random() * playableMoves.length)];
    console.log("Got randomly: ", x, y);
    handleAttack(wss, { gameId, x: +x, y: +y, indexPlayer }, true);
  }
};