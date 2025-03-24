export class TahashUser {
    #manager;
    userId = -1; // wca account id
    data;
    /*
    user data structure:
    data: [
        {
            compNumber: uint,
            results: [
                {
                    eventId: str,
                    times: str[]
                }
            ]
        }
    ]
    */

    constructor(userManager, src) {
        this.#manager = userManager;

        src = src || {};
        this.userId = src.userId    || -1;
        this.data = src.data        || [];
    }

    // save this TahashUser using the linked UserManager
    async saveToDB() {
        await this.#manager.saveUser(this);
    }
}