import { addPriorityCells } from "./addPriorityCell.js";

export const getPriorityCells = (ship, shots, coordinates) => {
  // exploring surrounding cells
  ship.priorityCells = [];
  console.log('random switch first degree balue:',ship.hits.length)
  switch (ship.hits.length) {
    case 1:
      ship.priorityCells = [];
      // get up, down, left right cells
      const arrowDirections = [
        `${coordinates[0]}${coordinates[1] - 1}`,
        `${coordinates[0]}${+coordinates[1] + 1}`,
        `${coordinates[0] - 1}${coordinates[1]}`,
        `${+coordinates[0] + 1}${coordinates[1]}`,
      ];

      addPriorityCells(arrowDirections, shots, ship);

      break;
    case 2:
      ship.priorityCells = [];
      let directions;
      switch (ship.hits[1] - ship.hits[0]) {
        case 1:
          directions = [
            `${ship.hits[0][0]}${ship.hits[0][1] - 1}`,
            `${ship.hits[1][0]}${+ship.hits[1][1] + 1}`,
          ];

          addPriorityCells(directions, shots, ship);

          break;
        case 2:
          // cell is guaranteed to be in between hit cells
          ship.priorityCells.push(`${ship.hits[0][0]}${+ship.hits[0][1] + 1}`);
          break;
        case 3:
          ship.priorityCells.push(
            ...[
              `${ship.hits[0][0]}${+ship.hits[0][1] + 1}`,
              `${ship.hits[1][0]}${ship.hits[1][1] - 1}`,
            ]
          );
          break;
        case 10:
          directions = [
            `${ship.hits[0][0] - 10}${ship.hits[0][1]}`,
            `${+ship.hits[1][0] + 10}${ship.hits[1][1]}`,
          ];

          addPriorityCells(directions, shots, ship);

          break;
        case 20:
          ship.priorityCells.push(`${+ship.hits[0][0] + 1}${ship.hits[0][1]}`);
          break;
        case 30:
          ship.priorityCells.push(
            ...[
              `${+ship.hits[0][0] + 1}${ship.hits[0][1]}`,
              `${ship.hits[1][0] - 1}${ship.hits[1][1]}`,
            ]
          );
          break;
      }
      // if (!killedHuge) {
      //   const step = (ship.hits[1] - ship.hits[0])/3;
      //   ship.priorityCells = [];
      //   for (
      //     let direction = (+ship.hits[0] + step).toString().padStart(2,"0");
      //     direction < ship.hits[1];
      //     direction = (+direction + step).toString().padStart(2,"0")
      //   ) {
      //     if (!ship.hits.includes(direction)) {
      //       ship.priorityCells.push(direction);
      //     }
      //   }
      // } else {

      // }
      break;
    case 3:
      // cells are consecutive
      if (ship.hits[1] - ship.hits[0] === ship.hits[2] - ship.hits[1]) {
        ship.priorityCells = [];
        // horizontal if Y is 0, i.e. 10
        if (ship.hits[1] - ship.hits[0] === 10) {
          const directions = [
            `${ship.hits[0][0] - 1}${ship.hits[0][1]}`,
            `${+ship.hits[2][0] + 1}${ship.hits[2][1]}`,
          ];

          addPriorityCells(directions, shots, ship);
        } else {
          const directions = [
            `${ship.hits[0][0]}${ship.hits[0][1] - 1}`,
            `${ship.hits[2][0]}${+ship.hits[2][1] + 1}`,
          ];

          addPriorityCells(directions, shots, ship);
        }
        // priority cell is within array of hits
      } else {
        const step = (ship.hits[2] - ship.hits[0]) / 3;
        for (
          let direction = (+ship.hits[0] + step).toString().padStart(2, "0");
          direction < ship.hits[2];
          direction = (+direction + step).toString().padStart(2, "0")
        ) {
          if (!ship.hits.includes(direction)) {
            ship.priorityCells = [direction];
            break;
          }
        }
      }
  }

  // already added coord to hits
  // const [firstX, firstY] = ship.hits[0];
  // const [secondX, secondY] = ship.hits[1];
  // // vertical if X is same
  // if (firstX == x) {
  //   const direction = secondY - firstY;
  // }
  // }

  // highProb, shots, x, y
  // // did not hit with random before
  // if (!highProb) {
  //   highProb = {
  //     cells: [],
  //     firstRandomHit: `${x}${y}`
  //   }
  //   for (let newX of [x-1, x+1]) {
  //     const coord = `${newX}${y}`;
  //     if (!shots.has(coord) && newX >= 0 && newX < 10) highProb.cells.push(coord);
  //   }
  //   for (let newY of [y-1, y+1]) {
  //     const coord = `${x}${newY}`;
  //     if (!shots.has(coord) && newY >= 0 && newY < 10) highProb.cells.push(coord);
  //   }
  // } else {
  //   const direction = 21 - 31
  //   // XY -10 left 10 right 0-1 top 01 bottom
  // }
  console.log('Look at my priority cells:', ship.priorityCells)
};
