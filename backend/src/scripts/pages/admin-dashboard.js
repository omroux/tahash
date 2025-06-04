import { resizeEventBoxes } from "/src/scripts/backend/utils/eventBoxesUtils.js";

const eventSelectContainer = document.getElementById("eventSelectContainer");
const eventResultsContainer = document.getElementById("eventResultsContainer");
const backToAllEventsBtn = document.getElementById("backToAllEventsBtn");
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

    for (let i = 0; i < eventsInfo.length; i++) {
        const currEvent = eventsInfo[i];
        addEventBox(currEvent.eventId, currEvent.eventTitle, currEvent.iconName, () => { setEventView(currEvent.eventId) });
    }

    backToAllEventsBtn.onclick = () => setEventView(null);

    setLoadingState(false);
});

function addEventBox(eventId, eventTitle, eventIconName, onclick) {
    // event box
    const eventBoxEl = document.createElement("div");
    eventBoxEl.id = `event-select-${eventId}`;
    eventBoxEl.className = "Event-Select-Box";

    // event icon
    const eventIconEl = document.createElement("span");
    eventIconEl.className = `Cubing-Icon ${eventIconName}`;
    eventBoxEl.appendChild(eventIconEl);
    
    // event title
    const eventTitleEl = document.createElement("p");
    eventTitleEl.className = "Event-Name-Title";
    eventTitleEl.innerText = eventTitle;
    eventBoxEl.appendChild(eventTitleEl);

    // add the new event box to the list
    eventBoxes.push(eventBoxEl);
    resizeEventBoxes([eventBoxEl]);

    // set the onclick event
    if (onclick)
        eventBoxEl.onclick = onclick;

    // add it to the dom
    eventSelectContainer.appendChild(eventBoxEl);

    return eventBoxEl;
}

// which event to view
// if eventId is null, goes back to see all events
function setEventView(eventId) {
    if (!eventId) {
        unhideElement(eventSelectContainer);
        hideElement(eventResultsContainer);
        return;
    }

    // await sendRequest("/");
}
