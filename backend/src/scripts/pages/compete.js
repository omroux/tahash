const scrContainers = document.querySelectorAll("[id^='scrContainer'");
const scrNumTitle = document.getElementById("scrNumberTitle");
const nextScrBtn = document.getElementById("nextScrBtn");
const prevScrBtn = document.getElementById("prevScrBtn");

let activeScr = 0;
const numScr = scrContainers.length;

let lastActive = -1;
function updateActiveScr() {
    activeScr = Math.min(Math.max(activeScr, 0), numScr - 1);

    if (lastActive >= 0)
        scrContainers[lastActive].hidden = true;
    lastActive = activeScr;
    scrContainers[activeScr].hidden = false;

    scrNumTitle.innerText = `${activeScr+1}/${numScr}`;
}

window.onload = () => {
    // hide all containers
    for (let i = 0; i < scrContainers.length; i++)
        scrContainers[i].hidden = true;

    activeScr = 0;
    updateActiveScr();
};

nextScrBtn.onclick = () => {
    activeScr += 1;
    updateActiveScr();
};

prevScrBtn.onclick = () => {
    activeScr -= 1;
    updateActiveScr();
};

