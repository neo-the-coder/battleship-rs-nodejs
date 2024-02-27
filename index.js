import { httpServer } from "./src/http_server/index.js";
import { initWS } from "./src/ws_server/index.js";

initWS(httpServer);

const HTTP_PORT = 3000;

console.log(`Start static http server on the ${HTTP_PORT} port!`);
httpServer.listen(HTTP_PORT);
