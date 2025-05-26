onPageLoad(async () => {
    const isAdmin = await getAdminPerms();
    if (!isAdmin) {
        window.location = "/";
        return;
    }

    setLoadingState(false);
});
