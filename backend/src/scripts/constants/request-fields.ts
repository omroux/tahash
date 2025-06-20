/**
 * Contains the names of request body fields used in HTTP POST/PUT/PATCH requests.
 * Use these constants when accessing request body properties to ensure consistency and avoid typos.
 */
export const RequestFields = {
    UserId: "userId",
    Password: "eventId",
    Times: "times",
    SubmissionState: "submissionState"
};

export type RequestField = typeof RequestFields[keyof typeof RequestFields];
