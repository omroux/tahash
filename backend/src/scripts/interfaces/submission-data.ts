import {SubmissionState} from "../backend/database/comps/submission-state.js";
import {PackedResult} from "./packed-result.js";

export interface SubmissionData<ArgType = undefined> {
    userId: number;
    submissionState: SubmissionState;
    times: PackedResult<ArgType>[];
    resultStr: string;
}