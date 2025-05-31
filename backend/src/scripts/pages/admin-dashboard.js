import { resizeEventBoxes } from "/src/scripts/backend/utils/eventBoxesUtils.js";

const eventSelectContainer = document.getElementById("eventSelectContainer");
const eventBoxes = [];

onPageLoad(async () => {
    const isAdmin = await getAdminPerms();
    if (!isAdmin) {
        window.location = "/";
        return;
    }
    
    addEventBox("333", "3x3x3", "event-333");
    addEventBox("333", "3x3x3", "event-333");
    addEventBox("333", "3x3x3", "event-333");
    addEventBox("333", "3x3x3", "event-333");
    setLoadingState(false);
});

function addEventBox(eventId, eventTitle, eventIconName) {
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

    eventBoxes.push(eventBoxEl);
    resizeEventBoxes([eventBoxEl]);
    eventSelectContainer.appendChild(eventBoxEl);
}
