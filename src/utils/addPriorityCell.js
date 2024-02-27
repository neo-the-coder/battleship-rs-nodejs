export const addPriorityCells = (directions, shots, ship) => {
  for (const direction of directions) {
    // cell is not out of boundary and is not attacked before
    if (
      !direction.includes("-") &&
      direction.length === 2 &&
      !shots.has(direction)
    ) {
      ship.priorityCells.push(direction);
    }
  }
};
