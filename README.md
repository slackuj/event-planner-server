# EVENT PLANNER
Event Planner is a full-stack event planning application that allows<br>
users to create, manage, and browse events with secure authentication and a responsive UI.<br>
This project demonstrates practical full-stack development skills in a real-world scenario.

# FEATURES
This project provides following features:<br>
<br>**Event Management**<br>
* create, edit, delte, join events <br>
* rsvp, tags<br>
* surf events, filter events, public events, private events<br>
* manage event participants<br>

<br>**Authentication & Authorization**<br>
* user signup and login<br>
* secure authentication using JWT<br>
* refresh token implementation
* authorization<br>
* email verification<br>

# ASSUMPTIONS
* Users can join/rsvp any public event
* Organizer can add participant(request participant) to join any public/private events
* Past events are not editable. Past events can only be deleted.
* Event Tags can be added to all public/participating events/requested events/past events
* Location is being stored using Location Tags
* Location Tags and Event Tags are only deleted from user_location_tags and user_event_tags tables considering the following facts:<br>
      i. Other users can also add same tags later<br>
      ii. tags can be used for recommendation !!!!

# TECH STACK
<br>**Frontend**<br>
* React
* TypeScript
* Redux Toolkit (Global State Management)
* RTK Query (Data Fetching & Cache Management)

<br>**Backend**<br>
* Node.js
* Express
* Typescript

<br>**Database**<br>
* MYSQL

<br>**Query Builder**<br>
* Knex.js

<br>**Local DB Service**<br>
* Docker Compose

<br>**Email Service**<br>
* Sendgrid

<br>**Media**<br>
* Cloudinary

# FRONTEND
The frontend of this project is hosted at: https://github.com/slackuj/event-planner-client<br>
# BACKEND
The backend of this project is hosted at: https://github.com/slackuj/event-planner-server/tree/master<br>

# REQUIREMENTS
1. Docker Compose<br>
2. git<br>
3. node.js<br>
4. Terminal or IDE of your choice<br>
5. Cloudinary Account<br>
6. Sendgrid Account<br>

# INSTALLATION
The following lines of codes are for Ubuntu 25.10.<br>
These should be similar for other environments.<br>
<br>
> You can use npx degit for cloning if you don't want to copy the git history !!!<br>
1. Clone Frontend in an empty project directory: <br>
```bash
git clone https://github.com/slackuj/event-planner-client.git
cd event-planner-client
npm install
```
2. Clone Backend in an empty project directory: <br>
```bash
git clone https://github.com/slackuj/event-planner-server.git
cd event-planner-server
npm install
```
3. Set up all required environment variables as specified in `.env.example` file into `.env` file<br>
in both frontend and backend<br>

4. Start Docker Compose and Perform Database Seeding
> command for starting docker compose may differ for you based on your environment and user privileges.
>
> make sure to check and do update script in server > package.json for running docker compose
```bash
cd event-planner-server
npm run docker:up
npm run migrate:latest
npm run db:seed
```
> If it is not your first attemt for migration, You may need to run `npm run migrate:rollback` before `npm run migrate:latest`.
> 
> You need to run migration and seeding only once !

# START GUIDE
You can now run the project using following steps:<br>
Make sure docker compose is running !!!!<br>
<br> You may need to use multiple terminals or multiple terminal tabs in the IDE.<br>
<br>**Start Backend**<br>
```bash
cd event-planner-server
npm run docker:up
npm run start
```
<br>**Start Frontend**<br>
```bash
cd event-planner-client
npm run dev
```
<br>**Event Planner should be up and running on your FRONTEND_ORIGIN**<br>
<br>**Dummy Users**<br>
* alice@example.com **password**: passwordPW123#
* bob@example.com **password**: passwordPW123#
* charlie@example.com **password**: passwordPW123#
* diana@example.com **password**: passwordPW123#
* evan@example.com **password**: passwordPW123#

# BUGS 
Please report any bugs and issues here in this repository or to slackuj@gmail.com.


