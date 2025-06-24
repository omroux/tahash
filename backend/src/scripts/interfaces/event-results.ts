import {SubmissionData} from "./submission-data.js";

export interface EventResults<ArgsType = any> {
    eventId: string;
    scrambles: string[];
    submissions: SubmissionData<ArgsType>[];
}
