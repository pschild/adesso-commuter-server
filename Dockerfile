FROM node:13-alpine AS BUILD_IMAGE
WORKDIR /app

# copy contents
COPY . /app

RUN apt-get install chromium-browser --yes

# install, test and build
RUN npm install
RUN npm test
RUN npm run compile

# remove development dependencies
RUN npm prune --production

FROM node:13-alpine
WORKDIR /app

RUN apt-get install chromium-browser --yes

# copy dist/ and node_modules/
COPY --from=BUILD_IMAGE /app/dist ./dist
COPY --from=BUILD_IMAGE /app/node_modules ./node_modules

# run
CMD [ "node", "./dist" ]
EXPOSE 9062
