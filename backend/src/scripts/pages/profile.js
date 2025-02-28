const logoutBtn = document.querySelector("#logout_btn");
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

window.onload = async () => {
    wcaMeData = await sendRequest("/wca-me");
    if (wcaMeData.error) {
        window.location = wcaMeData.redirectTo;
    }

    updateWcaData();
    setLoadingState(false);
};

logoutBtn.onclick = async () => {
    // TODO: request for server /logout. if the request was not made by a client, redirect to /profile. if it was made by a client, clear the cookie.
    logoutBtn.disabled = true;
    await sendRequest("/logout");
    window.location = "/login";
};
