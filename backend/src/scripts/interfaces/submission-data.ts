import {SubmissionState} from "../backend/database/comps/submission-state.js";
import {PackedResult} from "./packed-result.js";

export interface SubmissionData<ArgType = any> {
    userId: number;
    submissionState: SubmissionState;
    times: PackedResult<ArgType>[];
    resultStr: string;
}