import {SubmissionData} from "./submission-data.js";

export interface EventData {
    eventId: string;
    scrambles: string[];
    submissions: SubmissionData[];
}