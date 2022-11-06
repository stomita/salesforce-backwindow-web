# Backwindow

Backwindow is a Salesforce login service that allows multiple users to sign in to multiple orgs without sharing any credentials or passwords, using JWT grant.

Backwindow is secure because it does not persistently expose credential information, unlike sharing URL with the Salesforce CLI `force:org:open` command (a.k.a frontdoor.jsp URL), which contains session id credential in the URL string.
Only registered users can get login access to the orgs which accept JWT bearer auth.

# Setup

## Using Hosted version of Backwindow

Hosted version of Backwindow is not available now.
You must deploy the code to your own server to use backwindow.

## Deploy Backwindow as Your Own App

### Setup Google Sign-in / Salesforce Connected App for Backwindow Web App

In order to run the backwindow app as your own app, you need to setup Google Sign-in Client and Salesforce Connected App.

* Google Sign-in https://developers.google.com/identity/sign-in/web/sign-in

The origins and callback URLs(redirect URIs) must match the deploying app URL, which will be `https://<your-app-name>.herokuapp.com` by default.

### Setup JWT Bearer Flow

You need to enable JWT bearer flow in your DevHub org. See the link below to enable the JWT grant.

https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_auth_jwt_flow.htm

Please memo the client ID of the connected app you created in the above setup, and keep the private key file generated.

### Deploy App 

You can easily deploy to heroku using the button below:

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/stomita/salesforce-backwindow-web)

In the Config vars section, you need to enter the values got from the previous step.

- **GL_BACKWINDOW_CLIENT_ID**: Client ID obtained in Google sign-in client registration.
- **GL_BACKWINDOW_CLIENT_SECRET**: Client secret obtained in Google sign-in client registration.
- **GL_BACKWINDOW_REDIRECT_URI**: Redirect URI registered in the Google sign-in client.
- **SF_BACKWINDOW_CLIENT_ID**: Client ID obtained in Salesforce connected app registration.
- **SF_BACKWINDOW_CLIENT_SECRET**: Client secret obtained in Salesforce connected app registration.
- **SF_BACKWINDOW_REDIRECT_URI**: Callback URL registered in the Salesforce connected app.
- **SF_DEVHUB_CLIENT_ID** : Your Salesforce connected app client ID for DevHub authentication.
- **SF_DEVHUB_PRIVATE_KEY_BASE64**: Private key of the cert in the connected app for DevHub JWT authentication, encoded in base64. To encode a key file to base64, execute `openssl base64 -A ./path/to/server.key`. 
- **ALLOWED_USER_EMAILS**: List Google accounts (email addresses) in comma-separated, that are allowed to use the backwindow app to login to scratch orgs.

# Getting Started

## Generate Sharable Login URL

In the "Home" screen you can generate a login URL of backwindow without any credential information.

![image](https://user-images.githubusercontent.com/23387/142156337-6980f35e-6d55-4965-a8dd-6ce420ac737f.png)

To generate a login URL, you need to enter the DevHub org ID, the username of the user to log in, and the environment of the org you want to log in.

Note that the org ID is not the org where you want to log in, but the org of the DevHub.

You should also keep in mind that the org ID should be 18 characters long, not 15.

You can get the 18-char org ID from Salesforce CLI by `force:org:display` command.

## Share Login URL

After you generated the login URL, you can copy it and paste anywhere to share other members (e.g. email, slack, chatter, or github PR comment).

It is secure because the URL is protected by the Google/Salesforce Login, and only users with registered email / username can get the login access.


