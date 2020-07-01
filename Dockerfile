FROM node:13-alpine AS BUILD_IMAGE
WORKDIR /app

# copy contents
COPY . /app

# install, test and build
RUN export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true && npm install
RUN npm test
RUN npm run compile

# remove development dependencies
RUN npm prune --production

FROM node:13-alpine
WORKDIR /app

RUN apk update && apk add chromium

# copy dist/ and node_modules/
COPY --from=BUILD_IMAGE /app/dist ./dist
COPY --from=BUILD_IMAGE /app/node_modules ./node_modules

# run
CMD [ "node", "./dist" ]
EXPOSE 9062
