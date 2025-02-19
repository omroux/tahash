const nameTxt = document.querySelector("#name_txt");
const wcaIdTxt = document.querySelector("#wca_id_txt");
const wcaImg = document.querySelector("#wca_img");

let wcaMeData;
 setLoadingState(true);

function updateWcaData() {
     nameTxt.innerHTML = wcaMeData.name;
     wcaIdTxt.innerHTML = wcaMeData.wca_id;
     wcaImg.src = wcaMeData.avatar.url;
}

window.onload = async () => {
    wcaMeData = await sendRequest("/wca-me");
    if (wcaMeData.error)
        window.location = wcaMeData.redirectTo;

    updateWcaData();
    setLoadingState(false);
};
