# Backwindow

Backwindow is a Salesforce login service that allows multiple users to sign in to multiple orgs without sharing any credentials or passwords, using JWT grant.

Backwindow is secure because it does not persistently expose credential information, unlike sharing URL with the Salesforce CLI `force:org:open` command (a.k.a frontdoor.jsp URL).
Only registered users can get login access to the orgs which accept JWT bearer auth.

# Setup

## Using Hosted version of Backwindow

There is a hosted version of Backwindow web app.

https://backwindow.herokuapp.com/

Note that when you utilize this hosted version of Backwindow, your JWT key will be stored in the database which you don't have management privilege,
which might be against your company's security policy.

## Deploy Backwindow as Your Own App

### Setup Google Sign-in / Salesforce Connected App for Backwindow Web App

In order to run the backwindow app as your own app, you need to setup Google Sign-in Client and Salesforce Connected App.

* Google Sign-in https://developers.google.com/identity/sign-in/web/sign-in
* Salesforce Connected App https://help.salesforce.com/s/articleView?id=sf.connected_app_overview.htm&type=5
	- You need to add follwing scopes: "Access the identity URL service (id, profile, email, address, phone), "Manage user data via APIs (api)".

The origins and callback URLs(redirect URIs) must match the deploying app URL, which will be `https://<your-app-name>.herokuapp.com` by default.

### Deploy App 

You can easily deploy to heroku using the button below:

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/stomita/salesforce-backwindow-web)

In the Config vars section, you need to enter the values got from the previous step.

# Getting Started

## Setup JWT Bearer Flow

First, you need to enable JWT bearer flow in your DevHub org. See the link below to enable the JWT grant.

https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_auth_jwt_flow.htm

Please memo the client ID of the connected app you created in the above setup, and keep the private key file generated.

## Configure Settings in Backwindow Web App

When you accessed to Backwindow web app, you will be prompted to Login with Google or Salesforce.

First, click the "Sign in with Salesforce" button and login to the DevHub org previously enabled the JWT auth.

After logged in, click "Admin" link in the top bar.

In the "Connected App Setting" section, click "Edit" button to enter the client ID and content of the private key file to the form, and press "Save".

Then in the "Allowed Users" section, add the users' email addresses you want to be accessed through Backwindow.

## Generate Sharable Login URL

In the "Home" screen you can generate a login URL of backwindow without any credential information.

To generate a login URL, you need to enter the DevHub org ID, the username of the user to log in, and the environment of the org you want to log in.

Note that the org ID is not the org where you want to log in, but the org of the DevHub.

You should also keep in mind that the org ID should be 18 characters long, not 15.

You can get the 18-char org ID from Salesforce CLI by `force:org:display` command.

## Share Login URL

After you generated the login URL, you can copy it and paste anywhere to share other members (e.g. email, slack, chatter, or github PR comment).

It is secure because the URL is protected by the Google/Salesforce Login, and only users with registered email / username can get the login access.


