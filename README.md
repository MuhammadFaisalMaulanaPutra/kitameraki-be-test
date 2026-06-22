# Backend Test #1

This is an improvement of an existing backend project. The main goal of this refactor is to make the backend more secure, maintainable, and predictable in production environments.

## How to run?
- install azure cosmos DB emulator on device
- rename local.settings.example.json to local.settings.json 
- install node modules on this package, run `npm install`
- build a backend with `npm build`, then run with `func start`. Maybe you need to install first, run `npm install -g azure-functions-core-tools@4 --unsafe-perm true`
- also run new terminal and run `azurite`, or install first on device by running `npm install -g azurite`
