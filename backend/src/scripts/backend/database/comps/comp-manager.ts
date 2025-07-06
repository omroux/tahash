import {createCompSrc, TahashComp, TahashCompFields} from "./tahash-comp.js";
import {Collection, WithId} from "mongodb";

/**
 * A singleton to manage the "comps" collection of the database.
 */
export class CompManager {
    /**
     * The singleton instance of {@link CompManager}.
     */
    private static instance: CompManager;

    private readonly collection: Collection<TahashCompFields>;
    private activeComp: TahashComp;

    /**
     * Construct a {@link CompManager}.
     * @param compsCollection The MongoDB {@link Collection} of the comps.
     */
    private constructor(compsCollection: Collection<TahashCompFields>) {
        if (CompManager.instance !== undefined)
            throw new Error("Attempted to instantiate a new singleton instance of CompManager where an instance already exists.");

        this.collection = compsCollection;
        this.activeComp = new TahashComp(createCompSrc(-1));
    }

    /**
     * Create the instance of the {@link CompManager} singleton.
     * @param compsCollection The MongoDB {@link Collection} of the comps.
     * @return The new {@link CompManager} instance.
     * @throws Error If a {@link CompManager} instance already exists.
     */
    public static async init(compsCollection: Collection<TahashCompFields>): Promise<CompManager> {
        if (this.instance !== null)
            throw new Error("CompManager instance already exists. Use CompManager.getInstance() instead.");

        this.instance = new this(compsCollection);

        // initialize comps collection if it's empty
        const count = await this.instance.collection.countDocuments({}, { limit: 1 });
        if (count == 0) {
            console.log("Comps database is empty. Initializing empty comp...");

            // save an empty comp with compNumber 0
            await this.instance.saveComp(
                new TahashComp({ compNumber: 0, startDate: new Date(1), endDate: new Date(1) }));

            // MongoDB needs more time to register saving the new comp
            await this.instance.collection.findOne({ });
        }

        // init active comp
        this.instance.activeComp = await this.instance.fetchActiveComp();
        return this.instance;
    }

    /**
     * Get the singleton instance of the {@link CompManager}.
     */
    public static getInstance(): CompManager {
        if (!this.instance)
            throw new Error("CompManager not initialized. Call init() first.");
        return this.instance;
    }

    /**
     * Fetch the active {@link TahashComp} from the database.
     * @return A {@link TahashComp} object of the comp with the highest `compNumber`.
     * @throws Error If the comps database does not contain comps.
     */
    private async fetchActiveComp(): Promise<TahashComp> {
        const compDoc: WithId<TahashCompFields> =
            (await this.collection.find().sort({ compNumber: -1 }).limit(1).toArray())[0];
        if (!compDoc)
            throw new Error("No comps found.");

        return TahashComp.fromDocument(compDoc as WithId<TahashCompFields>);
    }

    /**
     * Get the `compNumber` of the current active {@link TahashComp}.
     */
    public getActiveCompNum(): number {
        return this.activeComp.compNumber;
    }

    /**
     * Get a direct reference to the active {@link TahashComp}.
     */
    public getActiveComp(): TahashComp {
        return this.activeComp;
    }

    /**
     * Get a {@link TahashComp} object from the database by its comp number.
     * @param compNumber The comp number.
     * @return
     * - If the desired comp was found, returns the respective {@link TahashComp}.
     * - Otherwise, returns `null`.
     */
    public async getTahashComp(compNumber: number): Promise<TahashComp | null> {
        if (!this.compExists(compNumber))
            return null;

        // find the comp in the database
        const compDoc: WithId<TahashCompFields> | null = await this.collection.findOne({ compNumber: compNumber });

        // create and return the comp object
        return compDoc ? TahashComp.fromDocument(compDoc) : null;
    }

    /**
     * Check if a comp with a comp number exists.
     * @param compNumber The comp number to check.
     */
    compExists(compNumber: number) {
        return compNumber > 0 && compNumber <= this.getActiveCompNum();
    }

    /**
     * Save a {@link TahashComp} to the database by its comp number (if it already exists, just update its values).
     * @param tahashComp
     * @return Whether the update has been acknowledged (usually true).
     */
    public async saveComp(tahashComp: TahashComp): Promise<boolean> {
        return (await this.collection.updateOne({ compNumber: tahashComp.compNumber },
            { $set: {
                compNumber: tahashComp.compNumber,
                startDate: tahashComp.startDate,
                endDate:  tahashComp.endDate,
                data:  tahashComp.getData()
                } },
            { upsert: true })).acknowledged;
    }

    /**
     * Validate the active comp - if it has ended, create a new comp.
     * @param newSrc A source for the new competition, if it was created.
     * @param force Whether to force creating a new comp.
     */
    public async validateActiveComp(newSrc: TahashCompFields, force: boolean = false) {
        // check if the current comp is still active
        if (!force && this.activeComp.isActive())
            return;

        // create a new comp and save it to the database
        const newComp = new TahashComp(newSrc);
        newComp.fillScrambles();
        await newComp.saveToDB();
    }

    // TODO: remove if unnecessary
    // update the submission state for a user's submission
    // returns whether updating was successful
    // async updateSubmissionState(compNumber, eventId, userId, newSubmissionState) {
    //     if (!this.compExists(compNumber))
    //         return false;
    //
    //     const res = await CompManager.collection.updateOne({
    //         compNumber: compNumber,
    //         "data.eventId": eventId,
    //         "data.results.userId": userId
    //     },
    //     {
    //         $set: { "data.$[event].results.$[result].submissionState": newSubmissionState }
    //     },
    //     {
    //         arrayFilters: [
    //             { "event.eventId": eventId },
    //             { "result.userId": userId }
    //         ],
    //         upsert: false // don't update it if it doesn't exist
    //     });
    //
    //     // const successful = res.matchedCount > 0;
    //     //
    //     // if (successful) { // update local copy
    //     //     this.activeComp.
    //     // }
    //
    //     return res.matchedCount > 0;
    // }
}
