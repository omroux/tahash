/**
 * Contains the full list of API route paths used in the application.
 * Use these constants to ensure consistency when defining routes and generating client requests.
 */
export const Routes = {
    // page routes
    Page: {
        HomeRedirect: "/",
        Home: "/home",
        Login: "/login",
        Profile: "/profile",
        RedirectToAuth: "/redirect-to-auth",
        AuthCallback: "/auth-callback",
        Error: "/error",
        CompeteEvent: "/compete/:eventId",
        AdminDashboard: "/admin-dashboard",
        Scrambles: "/scrambles",
    },

    // get requests
    Get: {
        RetrieveTimes: "/retrieve-times",
        EventStatuses: "/event-statuses",
        IsAdmin: "/is-admin",
        GetCompEvents: "/get-comp-events",
        GetEventSubmissions: "/get-event-submissions",
        WCAUserData: "/wca-user-data",
        AuthenticateWithCode: "/auth-with-code",
        AuthenticateRefreshToken: "/auth-refresh-token"
    },

    // post requests
    Post: {
        UpdateTimes: "/update-times",
        UpdateHostname: "/update-hostname",
        UpdateSubmissionState: "/update-submission-state"
    }

} as const;