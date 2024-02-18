import { DB } from "../db/db.js";
import { handlePlayerRegistration, handleCreateGame, handleRoomUpdate } from "./handleWSReq.js";
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
          const newPlayer = handlePlayerRegistration(ws, data);
          ws.send(newPlayer);
          if (DB.rooms.length && ws.id) {
            const updateRoom = handleRoomUpdate(DB.rooms[0].roomId, ws.id);
            console.log('updating for a second pl', updateRoom)
            ws.send(updateRoom);
          }
          break;
        case "create_room":
          const newRoom = handleCreateGame(ws.id);
          ws.send(newRoom);
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

    ws.send(JSON.stringify("something"));
  });
};
