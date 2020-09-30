#!/bin/sh

DIRECTORY="${PWD##*/}"

git pull
docker build -t foo .
docker tag foo:latest localhost:5000/${DIRECTORY}
docker push localhost:5000/${DIRECTORY}
docker rmi foo:latest
