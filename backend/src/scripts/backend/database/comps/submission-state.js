export const SubmissionState = Object.freeze({
    Pending: 0,
    Approved: 1,
    Rejected: 2
});

const SubmissionStateStrMap = Object.freeze({
    [SubmissionState.Pending]: "Pending",
    [SubmissionState.Approved]: "Approved",
    [SubmissionState.Rejected]: "Rejected"
});

export const getSubmissionStateStr = (state) =>
    SubmissionStateStrMap[state] ?? "UNDEFINED";
