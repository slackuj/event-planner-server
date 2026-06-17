FROM node:24.12.0-alpine
LABEL authors="glaty"
WORKDIR /event-planner
# copy application source code
COPY . .

# install dependencies
RUN npm install

# Inform Docker which port the container listens on at runtime
EXPOSE 17190

#  Default command to run when the container starts
CMD ["npm", "start"]