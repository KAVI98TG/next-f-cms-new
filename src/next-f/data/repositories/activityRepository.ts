import { KEYS, read, seedActivity } from "../core";
export const activityRepository={getActivity:()=>read(KEYS.activity,seedActivity)};
