import {PackedResult} from "./packed-result.js";

export type UserEventResult = {
    finished: boolean;
    times: PackedResult[];
};
