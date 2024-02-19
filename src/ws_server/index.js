import { DB } from "../db/db.js";
import { handlePlayerRegistration, handleCreateRoom, handleRoomUpdate, handleWinners, handleUserJoin } from "./handleWSReq.js";
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
          const newPlayer = handlePlayerRegistration(ws, data.data.name);
          ws.send(newPlayer);
          wss.clients.forEach(client => {
            client.send(handleRoomUpdate());
            client.send(handleWinners());
          })
          break;
        case "create_room":
          const newRoom = handleCreateRoom(ws.id);
          ws.send(newRoom);
          break;
        case "add_user_to_room":
          handleUserJoin(wss, ws, data.data.indexRoom);  
        break;
        // Add other request handlers as needed
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
