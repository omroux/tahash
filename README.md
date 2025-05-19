# Tahash

Code for the weekly IL Cubers competition website. \
Official website is running at https://comp.kehilush.com


## Hosting Locally
If you would like to host this website on your machine (in order to ✨contribute✨ or add functionality), you can do so by following these instructions.


### Requirements:
- NodeJS
- Docker
- Python


### Initializing Local Clone
Follow these steps if you would like to host this website on your machine:
1. First, you must create a World Cube Association OAuth application, which you can do [here](https://www.worldcubeassociation.com/). Make sure to add your hosting url to the **Redirect URI** list, with the path `/auth-callback` (For example, `http://localhost:3000/auth-callback` if you're hosting locally, on port 3000).
2. Clone this repository on your machine.
3. Create a file `.env` in the `deploy` directory. Use this template for it (Don't include the square brackets):
    ```dosini
    APP_ID=[YOUR_WCA_APP_ID]
    CLIENT_SECRET=[YOUR_WCA_CLIENT_SECRET]
    ```
    This file determines the environment variables for the server.
    You can also include these optional parameters to the `.env` file:
    ```dosini
    MONGO_INITDB_ROOT_USERNAME=[MONGODB_USERNAME]
    MONGO_INITDB_ROOT_PASSWORD=[MONGODB_PASSWORD]
    PORT=[PORT_NUMBER]
    ```
    If you don't include a MongoDB username and password, the database will not be protected with credentials. The default value for the port number is 3000.


### Deploying & Running
In order to deploy your own version, you may use the provided `runner.py` script. Use it with command line arguments like this:
```bash
python runner.py [db|all] [on|stop|clear]
```
Note: 'db clear' clears the Database's storage. To start the website, simply run `python runner.py all on` to start both the database and the server. The runner will build the Docker image and start seperate containers for the website and database, as specified in `deploy/docker-compose.yml`. You can monitor the containers using the Docker CLI.


### Running Server Without Docker
In order to not run the server on a Docker container (which you would do mainly for debug purposes), you must have a MongoDB database running (on the same machine). You can use `runner.py` to only start the database (using the arguments `db on`). Aside from having the database running, you need to install the NodeJS package requirements. You can do this easily by navigating to the `/backend` directory in a terminal and running `npm install` to install the requirements. Once you have all the packages installed, you can run `npm start` to start the server.
