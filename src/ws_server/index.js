import { DB } from "../db/db.js";
import {
  handlePlayerRegistration,
  handleCreateRoom,
  handleUserJoin,
  handleGameStart,
  handleAttack,
  handleRandomAttack,
  handleSinglePlay,
  handleBot,
} from "./handleWSReq.js";
import { WebSocketServer } from "ws";

let isBotClient = false;

export const initWS = (server) => {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (client) => {
    console.log("Client connected to the Web Socket Server");

    // handle bot client
    if (isBotClient) {
      handleBot(client)
      isBotClient = false;
    }

    // Handle errors
    client.on("error", console.error);

    // Handle incoming messages
    client.on("message", (messageJSON) => {
      // parse message
      // console.log("-----Message--->", messageJSON.toString());
      const msg = JSON.parse(messageJSON.toString());
      if (msg.data.includes('"')) {
        msg.data = JSON.parse(msg.data);
      }
      const {type, data} = msg;

      // Handle different types of requests
      console.log("Command:", type);
      switch (type) {
        case "reg":
          handlePlayerRegistration(wss, client, data);
          break;
        case "create_room":
          handleCreateRoom(wss, client.id);
          break;
        case "add_user_to_room":
          handleUserJoin(wss, client.id, data.indexRoom);
          break;
        case "add_ships":
          handleGameStart(wss, data);
          break;
        case "attack":
          const {gameId, indexPlayer} = data;
          if (indexPlayer === DB.openGames[gameId].currentPlayer) {
            handleAttack(wss, data);
          }
          break;
        case "randomAttack":
          handleRandomAttack(wss, data);
          break;
        case "single_play":
          isBotClient = true;
          handleSinglePlay(wss, client.id);
          break;
      }
    });

    // Handle disconnection
    client.on("close", () => {
      console.log("Client disconnected");
      client.close();
    });
  });
};
