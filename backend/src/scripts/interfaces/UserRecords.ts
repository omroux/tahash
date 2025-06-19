export interface UserRecords {
    eventId: string;

    /**
     * // bestResults contains the best results for the event, and for each type of result
        it also saves the comp number (as an integer)
        the comp number's values:
            * >0 -> a tahash comp
            * =0 -> a wca comp
            * -1 -> never competed
    bestResults:
        --- different for each event type:
        --  AO5:
            { single, singleComp
                average, averageComp }
        --  MO3/BO3:
            { single, singleComp
                mean, meanComp }
        --  BO3:
            { single, singleComp,
                mean, meanComp }
        --  Multi:
            { best total points / -1,
            time of attempt with best score / -1,
            bestComp }
     */
    bestResults: object;
    
    // the full attempt
    times: ; // TODO: packed times
}