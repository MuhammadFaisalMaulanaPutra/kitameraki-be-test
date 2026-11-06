import {
    clearPublishJournal,
    deleteAllTasks,
    deleteSeedFormDocuments,
    deleteSeedFormHistory,
    writeSeedFormHistory,
    writeSeedFormSettings,
    writeSeedTasks,
} from "./cosmosTools";
import { SEED_ORGANIZATION_ID } from "../seed";

/* Reset the seed organization to a clean state: wipe its tasks, form documents
   (published definition, publish journal, legacy snapshots) and history, then
   write the seed task list, the seed form settings at version 1 and a single
   history entry for that version. Idempotent: run it as often as you like. */

(async () => {
    const removedTasks = await deleteAllTasks();
    console.log(`removed ${removedTasks} existing task(s) for org ${SEED_ORGANIZATION_ID}`);

    const removedForms = await deleteSeedFormDocuments();
    console.log(`removed ${removedForms} form document(s)`);

    const removedHistory = await deleteSeedFormHistory();
    console.log(`removed ${removedHistory} history snapshot(s)`);

    const writtenTasks = await writeSeedTasks();
    console.log(`seeded ${writtenTasks} task(s)`);

    const hadJournal = await clearPublishJournal();
    if (hadJournal) console.log("cleared leftover publish journal");

    const version = await writeSeedFormSettings();
    console.log(`seeded form settings (version ${version})`);

    await writeSeedFormHistory();
    console.log(`seeded form history (version ${version}, no migrations)`);
})().catch((err) => {
    console.error("reseed failed:", err.message);
    process.exit(1);
});
