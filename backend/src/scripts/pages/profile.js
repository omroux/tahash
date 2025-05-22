const logoutBtn = document.querySelector("#logout_btn");
const dashboardBtn = document.getElementById("dashboardBtn");
let wcaMeData;

// update wca data on page
function updateWcaData() {
    const nameTxt = document.querySelector("#name_txt");
    const wcaIdTxt = document.querySelector("#wca_id_txt");
    const wcaImg = document.querySelector("#wca_img");
    const wcaProfileLink = document.querySelector("#wca_profile_link");

    nameTxt.innerHTML = wcaMeData.name;
    wcaIdTxt.innerHTML = wcaMeData.wca_id;
    wcaImg.src = wcaMeData.avatar.url;
    wcaProfileLink.href = wcaMeData.url;
}

onPageLoad(async () => {
    if (!isLoggedIn()) {
        window.location = "/login";
        return;
    }

    if (!hasStoredWcaMeData()) {
        setLoadingState(true);

        wcaMeData = await getWcaMe();
        if (!wcaMeData) {
            window.location = "/login";
            return;
        }    
    }
    else
        wcaMeData = await getWcaMe();


    updateWcaData();
    setLoadingState(false);

    getAdminPerms().then(isAdmin => {
        if (isAdmin)    dashboardBtn.removeAttribute(hiddenAttribute);
        else            dashboardBtn.parentElement.removeChild(dashboardBtn);
    }); 
});

logoutBtn.onclick = () => {
    // TODO: request for server /logout. if the request was not made by a client, redirect to /profile. if it was made by a client, clear the cookie.
    logoutBtn.disabled = true;
    clearLoginData();
    window.location = "/login";
};
