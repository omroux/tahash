/**
 * Describes the submission progress status for a specific event.
 * - `NotStarted`: The user has not begun the submission.
 * - `InProgress`: The user has started but not completed the submission.
 * - `Completed`: The submission has been finalized.
 */
export enum EventSubmissionStatus {
    /**
     * The user has not begun the submission.
     */
    NotStarted = "not_started",

    /**
     * The user has started but not completed the submission.
     */
    InProgress = "in_progress",

    /**
     * The submission has been finalized.
     */
    Completed = "finished"
}
