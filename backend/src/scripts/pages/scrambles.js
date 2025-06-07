import { resizeEventBoxes } from "/src/scripts/backend/utils/eventBoxesUtils.js";
const eventBoxIdPrefix = "event-select-";
const eventBoxes = document.querySelectorAll(`[id^="${eventBoxIdPrefix}"]`);

// resize on window resize
window.addEventListener("resize", function(e) {
    resizeEventBoxes(eventBoxes);
});

// resize on start
resizeEventBoxes(eventBoxes);

// get an event's id from the event box element
const getEventId = (eventBoxEl) => eventBoxEl.id.substring(eventBoxIdPrefix.length);

for (let i = 0; i < eventBoxes.length; i++) {
    eventBoxes[i].onclick = () => {
        chooseEvent(eventBoxes[i]);
    };
}

function chooseEvent(eventBoxEl) {
    console.log(`Picked event ${getEventId(eventBoxEl)}`);
    window.location = `/compete/${getEventId(eventBoxEl)}`;
}

onPageLoad(async () => {
    const wcaMeData = await getWcaMe(true);
    if (!wcaMeData) {
        clearLoginData();
        window.location = "/login";
    }

    const headers = { };
    headers[userIdHeader] = wcaMeData.id;
    const res = await sendRequest("/eventStatuses", { headers: headers }); // res = [ { eventId, status } ]
    if (res.error) {
        throwError(res.error);
        return;
    }

    const statusAttribute = "status";
    for (let i = 0; i < eventBoxes.length; i++) {
        eventBoxes[i].setAttribute(statusAttribute, res[getEventId(eventBoxes[i])]);
    }

    setLoadingState(false);
});
