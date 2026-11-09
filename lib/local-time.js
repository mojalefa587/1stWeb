export function getCheckinDay(date = new Date()) {
  const shifted = new Date(date.getTime() + 90 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

export function getRaffleMonth(date = new Date()) {
  const shifted = new Date(date.getTime() + 2 * 60 * 60 * 1000);
  return {
    month: shifted.toISOString().slice(0, 7),
  };
}

export function getPreviousLocalMonth(date = new Date()) {
  const { month } = getRaffleMonth(date);
  const [year, monthNumber] = month.split("-").map(Number);
  const previous = new Date(Date.UTC(year, monthNumber - 2, 1));
  return previous.toISOString().slice(0, 7);
}
