import {SubmissionState} from "../backend/database/comps/submission-state.js";
import {PackedResult} from "./packed-result.js";

/**
 * Submission data of an attempt in a {@link TahashComp}.
 */
export interface SubmissionData<ArgType = any> {
    /**
     * The submitter's user id.
     */
    userId: number;

    /**
     * The submission's state.
     */
    submissionState: SubmissionState;

    /**
     * The full attempt.
     */
    times: PackedResult<ArgType>[];

    /**
     * The attempt's numeric result, in centiseconds.
     */
    finalResult: number;

    /**
     * A display string of the attempt's result.
     */
    resultStr: string;
}