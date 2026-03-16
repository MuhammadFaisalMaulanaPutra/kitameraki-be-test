1. Install Docker (sudo apt install docker.io on Linux)
2. Install and run the emulator (docker run -d --name cosmosdb-emulator -p 8081:8081 -p 1234:1234 -p 10250-10255:10250-10255 mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator:vnext-preview --protocol https).
3. Open Cosmos DB explorer at localhost:1234 to get your Cosmos URI and Key.
4. On Cosmos DB explorer, create a new database and container with /organizationId as partition key.
5. In the root folder, rename local.settings.json.example to local.settings.json and configure the Cosmos connection.
6. Install the azure function tools (npm install -g azure-functions-core-tools@4 --unsafe-perm true).
7. Install app dependency (npm install).
8. Build the app (npm run build).
9. Start the app (npm start).
