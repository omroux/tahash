/**
 * The state of a submission.
 */
export enum SubmissionState {
    Pending = 0,
    Approved = 1,
    Rejected = 2
}

/**
 * String representation of the {@link SubmissionState}s.
 */
export const submissionStateStr: Record<SubmissionState, string> = Object.freeze({
    [SubmissionState.Pending]: "Pending",
    [SubmissionState.Approved]: "Approved",
    [SubmissionState.Rejected]: "Rejected"
});

