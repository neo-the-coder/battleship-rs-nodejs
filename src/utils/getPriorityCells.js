import { addPriorityCells } from "./addPriorityCell.js";

export const getPriorityCells = (ship, shots, coordinates) => {
  // exploring surrounding cells
  ship.priorityCells = [];
  switch (ship.hits.length) {
    case 1:
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
            `${ship.hits[0][0] - 1}${ship.hits[0][1]}`,
            `${+ship.hits[1][0] + 1}${ship.hits[1][1]}`,
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
      break;
    case 3:
      // cells are consecutive
      if (ship.hits[1] - ship.hits[0] === ship.hits[2] - ship.hits[1]) {
        let directions;
        // horizontal if Y is 0, i.e. 10
        if (ship.hits[1] - ship.hits[0] === 10) {
          directions = [
            `${ship.hits[0][0] - 1}${ship.hits[0][1]}`,
            `${+ship.hits[2][0] + 1}${ship.hits[2][1]}`,
          ];
        } else {
          directions = [
            `${ship.hits[0][0]}${ship.hits[0][1] - 1}`,
            `${ship.hits[2][0]}${+ship.hits[2][1] + 1}`,
          ];
        }
        addPriorityCells(directions, shots, ship);
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
      break;
  }
};
