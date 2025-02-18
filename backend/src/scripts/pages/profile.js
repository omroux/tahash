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

const getWcaMe = async () => await (await fetch("/wca-me")).json();
window.onload = async () => {
    try {
        wcaMeData = await getWcaMe();
    }
    catch (err) {
        // redirect to login
        window.location = "/login";
        return;
    }

    updateWcaData();
    setLoadingState(false);
};
