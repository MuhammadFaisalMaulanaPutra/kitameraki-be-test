# Kitameraki Backend

## Local setup

Copy `local.settings.example.json` to `local.settings.json`. The example uses the Cosmos DB emulator connection string.

`NODE_TLS_REJECT_UNAUTHORIZED=0` disables TLS certificate validation for the emulator's self-signed certificate. Use it only for local development and never in Azure or production.

`AzureWebJobsStorage` is intentionally empty because this Functions app only uses HTTP triggers, so Azurite is not required.
