export function createSingleFlight() {
  let current: Promise<void> | null = null;
  return {
    run(task: () => Promise<void>) {
      if (current) return current;
      current = task().finally(() => { current = null; });
      return current;
    },
  };
}
