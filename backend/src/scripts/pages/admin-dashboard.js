import { resizeEventBoxes } from "/src/scripts/backend/utils/eventBoxesUtils.js";
import { SubmissionState, getSubmissionStateStr } from "/src/scripts/backend/database/comps/SubmissionState.js"
import { centisToString } from "/src/scripts/backend/utils/timesUtils.js";

const eventSelectContainer = document.getElementById("eventSelectContainer");
const submissionsViewContainer = document.getElementById("submissionsViewContainer");
const submissionsContainer = document.getElementById("submissionsContainer");
const backToAllEventsBtn = document.getElementById("backToAllEventsBtn");
const submissionBoxTemplate = document.getElementById("submissionBoxTemplate");
const updateSubmissionStateButtonsTemplate = document.getElementById("updateSubmissionStateButtonsTemplate");
const eventBoxes = [];

onPageLoad(async () => {
    const isAdmin = await getAdminPerms();
    if (!isAdmin) {
        window.location = "/";
        return;
    }

    const eventsInfo = await sendRequest(`/getCompEvents?${compNumberParamName}=${compNumber}`);
    if (!eventsInfo || eventsInfo.error) {
        throwError("Could not retrieve events.", eventsInfo ? `Details: ${eventsInfo.error}` : "");
        return;
    }

    // create event boxes and add them to the dom
    for (let i = 0; i < eventsInfo.length; i++) {
        eventSelectContainer.appendChild(
            createEventBox(eventsInfo[i], async () => { await setEventView(eventsInfo[i].eventId) })
        );
    }

    backToAllEventsBtn.onclick = async () => await setEventView(null);

    setLoadingState(false);
});


// create and event box element for the specified data
// eventInfo is: { eventId, iconName, eventTitle }
// onclick is not required
function createEventBox(eventInfo, onclick) {
    // event box
    const eventBoxEl = document.createElement("div");
    eventBoxEl.id = `event-select-${eventInfo.eventId}`;
    eventBoxEl.className = "Event-Select-Box";

    // event icon
    const eventIconEl = document.createElement("span");
    eventIconEl.className = `Cubing-Icon ${eventInfo.iconName}`;
    eventBoxEl.appendChild(eventIconEl);
    
    // event title
    const eventTitleEl = document.createElement("p");
    eventTitleEl.className = "Event-Name-Title";
    eventTitleEl.innerText = eventInfo.eventTitle;
    eventBoxEl.appendChild(eventTitleEl);

    // add the new event box to the list
    eventBoxes.push(eventBoxEl);
    resizeEventBoxes([eventBoxEl]);

    // set the onclick event
    if (onclick)
        eventBoxEl.onclick = onclick;

    return eventBoxEl;
}

// which event to view
// if eventId is null, goes back to see all events
async function setEventView(eventId) {
    if (!eventId) {
        unhideElement(eventSelectContainer);
        hideElement(submissionsViewContainer);
        return;
    }

    setLoadingState(true);

    const submissions = await sendRequest(`/getEventSubmissions?${compNumberParamName}=${compNumber}&${eventIdParamName}=${eventId}`);
    if (!submissions || submissions.error) {
        throwError("שגיאה בטעינת הגשות המקצה", submissions ? submissions.error : "");
        return;
    }

    // clear previous submission
    submissionsContainer.replaceChildren();

    // populate the event view with submissions
    for (let i = 0; i < submissions.length; i++)
        submissionsContainer.appendChild(createEventSubmission(submissions[i], eventId));

    hideElement(eventSelectContainer);
    unhideElement(submissionsViewContainer);

    setLoadingState(false);
}

const SUBMISSION_TEMPLATE_CLASSES = {
    SUBMITTER_ID: "Submitter-WCA-Id",
    SUBMITTER_NAME: "Submitter-Name",
    TIMES_CONTAINER: "Submission-Times-Container",
    TIME_LABEL: "Submission-Time-Label",
    RESULT_LABEL: "Submission-Result",
    STATUS_LABEL: "Submission-Status-Label",
    APPROVE_BTN: "Approve-Submission-Btn",
    REJECT_BTN: "Reject-Submission-Btn"
};
function createEventSubmission(submissionInfo, eventId) {
    const submissionBoxEl = submissionBoxTemplate.content.cloneNode(true);

    // submitter's wca id
    const wcaIdEl = submissionBoxEl.querySelector(`.${SUBMISSION_TEMPLATE_CLASSES.SUBMITTER_ID}`);
    wcaIdEl.innerText = submissionInfo.userData.wcaId;

    // submitter's name label
    const nameEl = submissionBoxEl.querySelector(`.${SUBMISSION_TEMPLATE_CLASSES.SUBMITTER_NAME}`);
    nameEl.innerText = submissionInfo.userData.name;

    // times labels
    const timesContainer = submissionBoxEl.querySelector(`.${SUBMISSION_TEMPLATE_CLASSES.TIMES_CONTAINER}`);
    for (const time of submissionInfo.times) {
        const timeLabelEl = document.createElement("span");
        timeLabelEl.className = "Submission-Time-Label";
        timeLabelEl.innerText = centisToString(time.centis, time.penalty);
        timesContainer.appendChild(timeLabelEl);
    }

    // result str label
    const resultLabel = submissionBoxEl.querySelector(`.${SUBMISSION_TEMPLATE_CLASSES.RESULT_LABEL}`);
    resultLabel.innerText = submissionInfo.resultStr;

    // status text
    const statusLabel = submissionBoxEl.querySelector(`.${SUBMISSION_TEMPLATE_CLASSES.STATUS_LABEL}`);
    const statusText = getSubmissionStateStr(submissionInfo.submissionState)
    statusLabel.innerText = statusText;
    statusLabel.classList.add(statusText);

    // add buttons
    if (submissionInfo.submissionState == SubmissionState.Pending)
        submissionBoxEl.appendChild(createUpdateSubmissionBtns(eventId, submissionInfo.userId));

    return submissionBoxEl;
}


function createUpdateSubmissionBtns(eventId, userId) {
    const buttonsContainer = updateSubmissionStateButtonsTemplate.content.cloneNode(true);

    const approveBtn = buttonsContainer.querySelector(`.${SUBMISSION_TEMPLATE_CLASSES.APPROVE_BTN}`);
    approveBtn.onclick = async () => {
        const successful = await approveSubmission(eventId, userId); // TODO: disable accept and reject buttons temporarily
        setEventView(eventId); // TODO: optimize refresh
    };

    const rejectBtn = buttonsContainer.querySelector(`.${SUBMISSION_TEMPLATE_CLASSES.REJECT_BTN}`);
    rejectBtn.onclick = async () => {
        const successful = await rejectSubmission(eventId, userId); // TODO: disable accept and reject buttons temporarily
        setEventView(eventId); // TODO: optimize refresh
    };

    return buttonsContainer;
}

// send a request to approve a submission
const approveSubmission = async (eventId, userId) =>
        await updateSubmissionState(eventId, userId, SubmissionState.Approved);

// send a request to reject a submission
const rejectSubmission = async (eventId, userId) =>
        await updateSubmissionState(eventId, userId, SubmissionState.Rejected);

// send a request to set a submission's state
// returns whether the update was successfull
async function updateSubmissionState(eventId, userId, submissionState) {
    const body = {
        compNumber: compNumber,
        eventId: eventId,
        userId: userId,
        submissionState: submissionState
    };

    const res = await sendRequest("/updateSubmissionState", { method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body) });

    if (!res || res.error) {
        throwError("בעיה בעדכון.", res ? res.error : "");
        return false;
    }

    // alert(`Submission in comp ${compNumber} in event ${eventId} of user ${userId} was updated successfully.`);
    return res.successful;
}
