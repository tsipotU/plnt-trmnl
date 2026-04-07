const MIN_INTERVAL = 2;

export function adjustInterval(currentInterval: number, answer: number): number {
  let newInterval = currentInterval;
  if (answer <= 2) {
    newInterval = currentInterval - 1;
  } else if (answer === 4) {
    newInterval = currentInterval + 1;
  } else if (answer === 5) {
    newInterval = currentInterval + 2;
  }
  return Math.max(newInterval, MIN_INTERVAL);
}

export function checkConvergence(recentAnswers: number[]): boolean {
  if (recentAnswers.length < 3) return false;
  const lastThree = recentAnswers.slice(-3);
  return lastThree.every(a => a === 3);
}
