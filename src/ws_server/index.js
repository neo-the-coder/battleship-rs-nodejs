import { handlePlayerRegistration } from "./handleWSReq.js";
import { WebSocketServer } from "ws";

export const initWS = (server) => {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("Client connected");

    // Handle errors
    ws.on("error", console.error);

    // Handle incoming messages
    ws.on("message", (message) => {
      const data = JSON.parse(message);
      data.data = JSON.parse(data.data)
      console.log("coming message", data);
      console.log("Command:", data.type);
      console.log("Result:", data.data);

      // Handle different types of requests
      switch (data.type) {
        case "reg":
          console.log("registered");
          // handleRegistration(ws, data);
          // const output = {
          //   ...data,
          //   error: false,
          //   errorText: "Something went wrong",
          // };
          const output = handlePlayerRegistration(data);
          console.log(output)
          // console.log(JSON.stringify(output))
          ws.send(output);
          break;
        case "create_game":
          // handleCreateGame(ws, data);
          break;
        // Add other request handlers as needed
      }
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
