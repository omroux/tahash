# Tahash

up at https://comp.kehilush.com/


## Hosting Locally
If you would like to host this website locally (or on another domain), there are a few changes to make:

1. Make sure you have [`NodeJS`](https://nodejs.org) installed.
2. `config.json` should be:
```json
{
    "port": PORT
    "baseUrl": "YOUR-BASE-URL",
    "local": true/false
}
```
Where:
- `port` is a valid port
- `baseUrl` includes the protocol (e.g. `"https://www.example.org"`). If you're hosting on `localhost`, use `baseUrl: "http://localhost"`
- `local` determines whether you're running locally or on an external domain.

3. If you don't already have a WCA OAuth app id, make one [here](https://www.worldcubeassociation.org/help/api).
The .env file should be:
```
APP_ID=[YOUR-WCA-APP-ID]
CLIENT_SECRET=[YOUR-WCA-CLIENT-SECRET]
```
Where:
- `APP_ID` is your WCA application's Application ID
- `CLIENT_SECRET` is your WCA application's Secret

