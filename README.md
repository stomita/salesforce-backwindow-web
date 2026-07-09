# Backwindow

Backwindow is a Salesforce login service that allows multiple users to sign in to multiple orgs without sharing any credentials or passwords, using JWT grant.

Backwindow is secure because it does not persistently expose credential information, unlike sharing URL with the Salesforce CLI `force:org:open` command (a.k.a frontdoor.jsp URL), which contains session id credential in the URL string.
Only registered users can get login access to the orgs which accept JWT bearer auth.

# Setup

## Using Hosted version of Backwindow

Hosted version of Backwindow is not available now.
You must deploy the code to your own server to use backwindow.

## Deploy Backwindow as Your Own App

### Setup Google Sign-in for Backwindow Web App

In order to run the backwindow app as your own app, you need to setup a Google Sign-in Client. This is how users authenticate to the backwindow web app itself.

* Google Sign-in https://developers.google.com/identity/sign-in/web/sign-in

The origins and callback URLs(redirect URIs) must match the deploying app URL, which will be `https://<your-app-name>.herokuapp.com` by default.

### Setup JWT Bearer Flow

You need to enable JWT bearer flow in the org(s) you want to log in to. See the link below to enable the JWT grant.

https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_auth_jwt_flow.htm

The org does not have to be a DevHub — any org (production / sandbox / scratch) works, as long as the Connected App is installed with its certificate uploaded and the target users pre-authorized.

Please memo the client ID (consumer key) of the connected app you created in the above setup, and keep the private key file generated.

### Deploy App 

You can easily deploy to heroku using the button below:

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/stomita/salesforce-backwindow-web)

In the Config vars section, you need to enter the values got from the previous step.

- **GL_BACKWINDOW_CLIENT_ID**: Client ID obtained in Google sign-in client registration.
- **GL_BACKWINDOW_CLIENT_SECRET**: Client secret obtained in Google sign-in client registration.
- **GL_BACKWINDOW_REDIRECT_URI**: Redirect URI registered in the Google sign-in client.
- **SF_JWT_CLIENT_ID**: Client ID (consumer key) of the Connected App used for JWT bearer login into the target org(s).
- **SF_JWT_PRIVATE_KEY_BASE64**: Private key of the cert in the JWT Connected App, encoded in base64. To encode a key file to base64, execute `openssl base64 -A ./path/to/server.key`.
- **SF_DEVHUB_CLIENT_ID** / **SF_DEVHUB_PRIVATE_KEY_BASE64**: (Deprecated aliases of `SF_JWT_CLIENT_ID` / `SF_JWT_PRIVATE_KEY_BASE64`, kept for backward compatibility) `SF_JWT_*` takes precedence when both are set.
- **ALLOWED_USER_EMAILS**: List Google accounts (email addresses) in comma-separated, that are allowed to use the backwindow app to login to the target orgs.
- **AGENT_API_KEY**: (Optional) Static API key for agent/programmatic access via `POST /api/backwindow`.
- **GH_OIDC_AUDIENCE**: (Optional) Expected `aud` claim for GitHub Actions OIDC token verification.
- **GH_OIDC_ALLOWED_REPOS**: (Optional) Comma-separated list of GitHub repositories (e.g. `owner/repo`) allowed to authenticate via OIDC.

# Getting Started

## Generate Sharable Login URL

In the "Home" screen you can generate a login URL of backwindow without any credential information.

![image](https://user-images.githubusercontent.com/23387/142156337-6980f35e-6d55-4965-a8dd-6ce420ac737f.png)

To generate a login URL, you need to enter the username of the user to log in and the environment (production / sandbox) of the org you want to log in to.

The target org is determined by the username; you do not need to specify an org ID.

## Share Login URL

After you generated the login URL, you can copy it and paste anywhere to share other members (e.g. email, slack, chatter, or github PR comment).

It is secure because the URL is protected by the Google Login, and only users with registered email can get the login access.

# API Access (Agent / CI)

For programmatic access from CI pipelines or automated agents, Backwindow provides a stateless API endpoint that returns a frontdoor.jsp URL as JSON, without requiring browser-based OAuth login.

## `POST /api/backwindow`

### Request Body

| Parameter | Required | Description |
|-----------|----------|-------------|
| `un`      | Yes      | Username of the user to log in (this alone determines the target org) |
| `ls`      | No       | Environment: `production` (default) or `sandbox` |
| `retURL`  | No       | Relative URL to redirect to after login |

### Authentication

One of the following headers is required (not both):

#### API Key

Set the `AGENT_API_KEY` environment variable on the server, then pass it in the request header:

```
X-API-Key: <your-api-key>
```

#### GitHub Actions OIDC

Configure `GH_OIDC_AUDIENCE` and `GH_OIDC_ALLOWED_REPOS` on the server, then pass the OIDC token obtained in a GitHub Actions workflow:

```
Authorization: Bearer <oidc-token>
```

### Response

```json
{
  "frontdoorUrl": "https://example.my.salesforce.com/secur/frontdoor.jsp?sid=...",
  "accessToken": "00D...",
  "instanceUrl": "https://example.my.salesforce.com"
}
```

### Example (curl with API Key)

```bash
curl -X POST https://<your-app>/api/backwindow \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $AGENT_API_KEY" \
  -d '{"un":"user@example.com"}'
```
