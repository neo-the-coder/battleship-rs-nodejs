export const DB = {
  players: [],
  rooms: [],
  openGames: {},
  possibleMoves: Array.from({ length: 100 }, (_, i) =>
    i.toString().padStart(2, "0")
  ),
};
