export function resizeEventBoxes(eventBoxes) {
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