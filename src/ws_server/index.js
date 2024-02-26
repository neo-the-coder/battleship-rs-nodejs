import { DB } from "../db/db.js";
import {
  handlePlayerRegistration,
  handleCreateRoom,
  handleUserJoin,
  handleGameStart,
  handleAttack,
  handleRandomAttack,
  // handleSinglePlay,
} from "./handleWSReq.js";
import { WebSocketServer } from "ws";

export const initWS = (server) => {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("Client connected to the Web Socket Server");

    // Handle errors
    ws.on("error", console.error);

    // Handle incoming messages
    ws.on("message", (message) => {
      console.log("-----Message--->", message.toString());
      const data = JSON.parse(message.toString());
      if (data.data.includes('"')) {
        data.data = JSON.parse(data.data);
      }

      // Handle different types of requests
      switch (data.type) {
        case "reg":
          handlePlayerRegistration(wss, ws, data.data.name);
          break;
        case "create_room":
          handleCreateRoom(wss, ws.id);
          break;
        case "add_user_to_room":
          handleUserJoin(wss, ws.id, data.data.indexRoom);
          break;
        case "add_ships":
          handleGameStart(wss, data.data);
          break;
        case "attack":
          const {gameId, indexPlayer} = data.data;
          if (indexPlayer === DB.openGames[gameId].currentPlayer) {
            handleAttack(wss, data.data);
          }
          break;
        case "randomAttack":
          handleRandomAttack(wss, data.data);
          break;
        case "single_play":
          handleSinglePlay(wss, ws.id);
          break;
      }
      // console.log("Command:", data.type);
      // console.log("Result:", data);
    });

    // Handle disconnection
    ws.on("close", () => {
      console.log("Client disconnected");
      ws.close();
    });
  });
};
