import { IStopTracker } from "./types";

const stopTrackers = new Map<string, Map<string, IStopTracker[]>>();

export const GetGlobalCollStopTrackers = (
  collection: string
): Map<string, IStopTracker[]> | undefined => {
  return stopTrackers.get(collection);
};

export const SetGlobalStopTrackers = (newTrackers: IStopTracker[]): void => {
  newTrackers.forEach((tracker) => {
    let collTrackers = stopTrackers.get(tracker.collection);
    if (!collTrackers) {
      collTrackers = new Map();
      stopTrackers.set(tracker.collection, collTrackers);
    }

    let userTrackers = collTrackers.get(tracker.userId);
    if (!userTrackers) {
      userTrackers = [];
    }

    userTrackers.push(tracker);
    collTrackers.set(tracker.userId, userTrackers);
    stopTrackers.set(tracker.collection, collTrackers);
  });
};

export const AddUserStopTracker = (newTracker: IStopTracker): void => {
  let collTrackers = stopTrackers.get(newTracker.collection);
  if (!collTrackers) collTrackers = new Map<string, IStopTracker[]>();

  let userTrackers = collTrackers.get(newTracker.userId);
  if (!userTrackers) userTrackers = [];

  userTrackers.push(newTracker);
  collTrackers.set(newTracker.userId, userTrackers);
  stopTrackers.set(newTracker.collection, collTrackers);
};

export const UpdateStopTracker = (tracker: IStopTracker): void => {
  const collTrackers = stopTrackers.get(tracker.collection);
  if (!collTrackers) return;
  const userTrackers = collTrackers.get(tracker.userId);
  if (!userTrackers) return;

  const idx = userTrackers.findIndex((t) => t.id === tracker.id);
  if (idx === -1) return;
  userTrackers[idx] = tracker;
  collTrackers?.set(tracker.userId, userTrackers);
  stopTrackers.set(tracker.collection, collTrackers);
};

export const DeleteStopTracker = (tracker: IStopTracker): void => {
  console.log("deleting stop tracker", tracker);
  const collTrackers = stopTrackers.get(tracker.collection);
  if (!collTrackers) return;
  let userTrackers = collTrackers.get(tracker.userId);
  if (!userTrackers) return;

  const idx = userTrackers.findIndex((t) => t.id === tracker.id);
  if (idx === -1) return;
  userTrackers = [
    ...userTrackers.slice(0, idx),
    ...userTrackers.slice(idx + 1, userTrackers.length),
  ];
  console.log("updated user trackers", userTrackers);
  collTrackers.set(tracker.userId, userTrackers);
  stopTrackers.set(tracker.collection, collTrackers);
};

export const PrintStopTracker = (): void => {
  stopTrackers.forEach((collTrackers, coll) => {
    console.log(coll);
    collTrackers.forEach((trackers, userId) => {
      console.log(userId);
      trackers.forEach((tracker) => console.log(tracker));
    });
    console.log("\n\n");
  });
};
