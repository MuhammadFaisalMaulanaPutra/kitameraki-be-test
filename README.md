local.settings.json:

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "UseDevelopmentStorage=true"
  },
  "Host": {
    "LocalHttpPort": 7071,
    "CORS": "*",
    "CORSCredentials": false
  },
  "ConnectionStrings": {}
}
```

Create new function:

```sh
func new --template "Http Trigger" --name MyHttpTrigger
```

Start the function:

```sh
npm run start
```

You can setup Azure Key Vault or provide needed configuration as command line env.
The package `dotenv` was going to be used but knowing it's only used on local development so it was cancelled,
we can use Azure Key Vault in production.


Task structure:
organizationId: hardcode to 1
Name: string
Description: string
Status: Not Started | In Progress | Completed | Cancelled
isDeleted
createdAt
updatedAt
