import { resizeEventBoxes } from "/src/scripts/backend/utils/eventBoxesUtils.js";

onPageLoad(async () => {
    const isAdmin = await getAdminPerms();
    if (!isAdmin) {
        window.location = "/";
        return;
    }



    setLoadingState(false);
});

function addEventBox(eventImg) {
    
}
