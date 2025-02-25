DOCKER_COMPOSE_PATH="./local_deploy/docker-compose.yml"
DATABASE_COMPOSE_SERVICE=mongo
DATABASE_CONTAINER_NAME=mongodb_local
WEBSITE_CONTAINER_NAME=website_local
WEBSITE_DOCKERFILE_PATH="./backend/"
WEBSITE_DOCKER_BUILD_NAME=tahash

# USAGE: ./manager.sh [db/all] [on/off]
# db -> starts/stops database
# all -> starts/stops both database and website (website cannot run without database)

# use `docker ps` to see the running containers

if [ "$1" == "db" ]; then
    if [ "$2" == "on" ]; then
        echo "Starting database..."
        docker compose -f ${DOCKER_COMPOSE_PATH} up -d ${DATABASE_COMPOSE_SERVICE}
        echo "Databse is working!"
    elif [ "$2" == "off" ]; then
        echo "Stopping database..."
        docker stop /${DATABASE_CONTAINER_NAME}
        echo "Stopped database successfully."
    else
        echo "Usage: 1=db/all, 2=on/off"
    fi
elif [ "$1" == "all" ]; then
    if [ "$2" == "on" ]; then
        echo "Building website..."
        docker build ${WEBSITE_DOCKERFILE_PATH} -t ${WEBSITE_DOCKER_BUILD_NAME}
        echo "Website built successfully!"
        echo "Starting all..."
        docker compose -f ${DOCKER_COMPOSE_PATH} up -d
        echo "Started database and website successfully."
    elif [ "$2" == "off" ]; then
        echo "Stopping all..."
        docker stop /${DATABASE_CONTAINER_NAME} # database
        docker stop /${WEBSITE_CONTAINER_NAME}  # website
        echo "Stopped database and website successfully."
    else
        echo "Usage: 1=db/all, 2=on/off"
    fi
else
    echo "Usage: 1=db/all, 2=on/off"
fi

# mongo command: mongosh --port 27017 --username admin --password 'password' --authenticationDatabase admin
