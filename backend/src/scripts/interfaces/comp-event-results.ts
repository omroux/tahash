import {SubmissionData} from "./submission-data.js";
import {EventId} from "../backend/database/comp-event.js";

/**
 * Scrambles and submissions of an event in a {@link TahashComp}.
 */
export interface CompEventResults<ArgsType = any> {
    scrambles: string[];
    submissions: SubmissionData<ArgsType>[];
}
