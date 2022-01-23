const hatchTrackers = new Map<string, string[]>();

export const GetGlobalHatchTrackers = (): Map<string, string[]> => {
  return hatchTrackers;
};

export const GetUserHatchTrackers = (userId: string): string[] => {
  return hatchTrackers.get(userId) || [];
};

export const AddHatchTracker = (userId: string, address: string): boolean => {
  let userTrackers = hatchTrackers.get(userId);
  if (!userTrackers) userTrackers = [];
  if (userTrackers.includes(address)) return false;
  userTrackers.push(address);
  hatchTrackers.set(userId, userTrackers);
  return true;
};

export const RemoveHatchTracker = (userId: string, address: string): void => {
  let userTrackers = hatchTrackers.get(userId);
  if (!userTrackers) return;
  userTrackers = userTrackers.filter((addr) => addr !== address);
  hatchTrackers.set(userId, userTrackers);
};

export const ClearUserHatchTrackers = (userId: string): void => {
  hatchTrackers.set(userId, []);
};
