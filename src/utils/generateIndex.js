// Generate 4 digit random number
export const getIndex = (prefix) =>
  Number(prefix + Math.floor(1000 + Math.random() * 9000));
