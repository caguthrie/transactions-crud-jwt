// Imports the Google Cloud client library
import Datastore from "@google-cloud/datastore";

// Your Google Cloud Platform project ID
const projectId = "tix-accountant-2";

// Creates a client
export const datastore = new Datastore({
    projectId: projectId
});
