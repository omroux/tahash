const eventBoxIdPrefix = "event-select-";
const eventBoxes = document.querySelectorAll(`[id^="${eventBoxIdPrefix}"]`);

// #region control event box sizing
function resizeEventBoxes() {
    // resize all event boxes
    for (let i = 0; i < eventBoxes.length; i++)
        resize2fit(eventBoxes[i]);

    function resize2fit(el) {
        el.style.setProperty("--font-size", "1em");
        const {width: max_width, height: max_height} = el.getBoundingClientRect();
    
        const title = el.querySelector(".Event-Name-Title");
        const {width, height} = title.getBoundingClientRect();
    
        let size = Math.min(max_width/width, max_height/height);
        if (size < 0.7) {
            size = 0.7;
            title.style.textWrap = "wrap";
        }
        else if (size > 1.25) {
            size = 1.25;
        }
    
        size = Math.ceil(size*10)/10;
        title.style.setProperty("--font-size", size + "em");
    }
}

// resize on window resize
window.addEventListener("resize", function(e) {
    resizeEventBoxes();
});

// resize on start
resizeEventBoxes();
// #endregion

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

window.onload = () => {
    // check if the user is logged in
    // if ()
};
