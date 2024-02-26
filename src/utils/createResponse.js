export const createResponse = (type, data) => {
  const response = JSON.stringify({
    type,
    data: JSON.stringify(data),
    id: 0,
  });
  console.log("RESULT:", response);
  return response;
};
