import { DB } from "../db/db.js";
import {
  handlePlayerRegistration,
  handleCreateRoom,
  handleUserJoin,
  handleGameStart,
} from "./handleWSReq.js";
import { WebSocketServer } from "ws";

export const initWS = (server) => {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("Client connected", "Look DB", DB);

    // Handle errors
    ws.on("error", console.error);

    // Handle incoming messages
    ws.on("message", (message) => {
      console.log("-----Message--->", message.toString());
      const data = JSON.parse(message.toString());
      if (data.data.includes('"')) {
        data.data = JSON.parse(data.data);
      }
      console.log("-----coming message unJSON", data);

      // Handle different types of requests
      switch (data.type) {
        case "reg":
          handlePlayerRegistration(wss, ws, data.data.name);
          break;
        case "create_room":
          handleCreateRoom(wss);
          break;
        case "add_user_to_room":
          handleUserJoin(wss, ws.id, data.data.indexRoom);
          break;
        case "add_ships":
          handleGameStart(wss, data.data);
          break;
        case "attack":
          // TODO: Implement attack handler
          break;
      }
      // console.log("Command:", data.type);
      // console.log("Result:", data);
    });

    // Handle disconnection
    ws.on("close", () => {
      console.log("Client disconnected");
      ws.close();
      // Handle cleanup if necessary
    });
  });
};
