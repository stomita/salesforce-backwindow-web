import crypto from "crypto";
import express, { Request } from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import jsonwebtoken from "jsonwebtoken";
import axios from "axios";
import { Connection, OAuth2 as SfOAuth2 } from "jsforce";
import { OAuth2Client as GlOAuth2Client } from "google-auth-library";
import jwksRsa from "jwks-rsa";

/**
 *
 */
const SF_LOGIN_URL = process.env.SF_LOGIN_URL ?? "https://login.salesforce.com";
const SF_SANDBOX_LOGIN_URL = "https://test.salesforce.com";
const SF_BACKWINDOW_CLIENT_ID = process.env.SF_BACKWINDOW_CLIENT_ID ?? "";
const SF_BACKWINDOW_CLIENT_SECRET =
  process.env.SF_BACKWINDOW_CLIENT_SECRET ?? "";
const SF_BACKWINDOW_REDIRECT_URI = process.env.SF_BACKWINDOW_REDIRECT_URI ?? "";

const GL_BACKWINDOW_CLIENT_ID = process.env.GL_BACKWINDOW_CLIENT_ID ?? "";

const GH_OIDC_AUDIENCE = process.env.GH_OIDC_AUDIENCE ?? "";
const GH_OIDC_ALLOWED_REPOS = (process.env.GH_OIDC_ALLOWED_REPOS ?? "")
  .split(/\s*,\s*/)
  .filter(Boolean);

const AGENT_API_KEY = process.env.AGENT_API_KEY ?? "";

/**
 *
 */
const SF_DEVHUB_ORG_ID = process.env.SF_DEVHUB_ORG_ID ?? "";
const SF_DEVHUB_CLIENT_ID = process.env.SF_DEVHUB_CLIENT_ID ?? "";
const SF_DEVHUB_PRIVATE_KEY_BASE64 =
  process.env.SF_DEVHUB_PRIVATE_KEY_BASE64 ?? "";
const SF_DEVHUB_PRIVATE_KEY = Buffer.from(
  SF_DEVHUB_PRIVATE_KEY_BASE64,
  "base64"
).toString("ascii");


const ALLOWED_USER_EMAILS = (process.env.ALLOWED_USER_EMAILS ?? "").split(
  /\s*,\s*/
);

const devHubOrgInfo = {
  id: SF_DEVHUB_ORG_ID,
  sfOrgId: SF_DEVHUB_ORG_ID,
  appClientId: SF_DEVHUB_CLIENT_ID,
  appPrivateKey: SF_DEVHUB_PRIVATE_KEY,
  allowedList: [
    ...ALLOWED_USER_EMAILS.map((email) => ({
      id: email,
      provider: "google",
      email,
    })),
    ...GH_OIDC_ALLOWED_REPOS.map((repo) => ({
      id: `github:${repo}`,
      provider: "github",
      email: repo,
    })),
    ...(AGENT_API_KEY
      ? [{ id: "apikey:agent", provider: "apikey", email: "agent" }]
      : []),
  ],
};

const sfOAuth2 = new SfOAuth2({
  loginUrl: SF_LOGIN_URL,
  clientId: SF_BACKWINDOW_CLIENT_ID,
  clientSecret: SF_BACKWINDOW_CLIENT_SECRET,
  redirectUri: SF_BACKWINDOW_REDIRECT_URI,
});
const glOAuth2 = new GlOAuth2Client(GL_BACKWINDOW_CLIENT_ID);

const ghJwksClient = jwksRsa({
  jwksUri: "https://token.actions.githubusercontent.com/.well-known/jwks",
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

const GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com";

function verifyGitHubOIDCToken(
  idToken: string,
  audience: string
): Promise<{
  sub: string;
  repository: string;
  actor: string;
}> {
  return new Promise((resolve, reject) => {
    jsonwebtoken.verify(
      idToken,
      (header, callback) => {
        if (!header.kid) {
          return callback(new Error("Missing kid in token header"));
        }
        ghJwksClient.getSigningKey(header.kid, (err, key) => {
          if (err) return callback(err);
          callback(null, key?.getPublicKey());
        });
      },
      {
        issuer: GITHUB_OIDC_ISSUER,
        audience,
        algorithms: ["RS256"],
      },
      (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded as any);
      }
    );
  });
}

/**
 *
 */
async function authenticateApiRequest(
  req: Request
): Promise<
  | { uid: string; provider: string }
  | { error: string; status: number; message: string }
> {
  const authHeader = req.headers["authorization"];
  const apiKeyHeader = req.headers["x-api-key"];

  if (authHeader && apiKeyHeader) {
    return {
      status: 400,
      error: "ambiguous_credentials",
      message:
        "Provide either Authorization or X-API-Key header, not both",
    };
  }

  if (!authHeader && !apiKeyHeader) {
    return {
      status: 401,
      error: "missing_credentials",
      message:
        "Provide Authorization: Bearer <oidc_token> or X-API-Key: <key> header",
    };
  }

  if (apiKeyHeader) {
    if (!AGENT_API_KEY) {
      return {
        status: 400,
        error: "apikey_auth_not_configured",
        message: "API key authentication is not configured",
      };
    }
    if (
      typeof apiKeyHeader !== "string" ||
      apiKeyHeader.length !== AGENT_API_KEY.length ||
      !crypto.timingSafeEqual(
        Buffer.from(apiKeyHeader),
        Buffer.from(AGENT_API_KEY)
      )
    ) {
      return {
        status: 401,
        error: "invalid_api_key",
        message: "The provided API key is invalid",
      };
    }
    return { uid: "agent", provider: "apikey" };
  }

  if (authHeader) {
    if (
      typeof authHeader !== "string" ||
      !authHeader.startsWith("Bearer ")
    ) {
      return {
        status: 401,
        error: "invalid_auth_header",
        message: "Authorization header must use Bearer scheme",
      };
    }
    const idToken = authHeader.slice(7);
    const audience =
      GH_OIDC_AUDIENCE || `${req.protocol}://${req.get("host")}`;
    try {
      const payload = await verifyGitHubOIDCToken(idToken, audience);
      const { repository } = payload;
      if (!GH_OIDC_ALLOWED_REPOS.includes(repository)) {
        return {
          status: 403,
          error: "repository_not_allowed",
          message: `Repository ${repository} is not in the allowed list`,
        };
      }
      return { uid: repository, provider: "github" };
    } catch (e) {
      return {
        status: 401,
        error: "invalid_token",
        message: (e as Error).message,
      };
    }
  }

  return {
    status: 401,
    error: "missing_credentials",
    message: "No valid credentials provided",
  };
}

/**
 *
 */
async function performBackwindowLogin(params: {
  uid: string;
  provider: string;
  hub: string;
  un: string;
  ls?: string;
  retURL?: string;
}): Promise<
  | {
      success: true;
      frontdoorUrl: string;
      instanceUrl: string;
      accessToken: string;
    }
  | { success: false; status: number; error: string; message: string }
> {
  const {
    uid,
    provider,
    hub: sfOrgId,
    un: username,
    ls: login = "production",
    retURL,
  } = params;

  if (
    !sfOrgId ||
    !username ||
    (retURL && !/^\/[\w\-:\/?#\[\]@!$&'\(\)*+,;=%]+$/.test(retURL))
  ) {
    console.error(
      [
        "error:invalid_backwindow_parameter",
        `provider:${provider}`,
        `uid:${uid}`,
        `hub:${sfOrgId}`,
        `username:${username}`,
        `ls:${login}`,
        `retURL:${retURL}`,
      ].join("\t")
    );
    return {
      success: false,
      status: 400,
      error: "invalid_backwindow_parameter",
      message: "Invalid or missing backwindow parameters",
    };
  }

  const org = sfOrgId === devHubOrgInfo.sfOrgId ? devHubOrgInfo : null;
  if (!org) {
    console.error(
      [
        "error:hub_org_not_found",
        `provider:${provider}`,
        `uid:${uid}`,
        `hub:${sfOrgId}`,
        `username:${username}`,
        `ls:${login}`,
      ].join("\t")
    );
    return {
      success: false,
      status: 404,
      error: "hub_org_not_found",
      message: "Hub org not found",
    };
  }

  const { appClientId, appPrivateKey, allowedList } = org;
  let isAllowed = false;
  for (const entry of allowedList) {
    if (entry.email === uid && entry.provider === provider) {
      isAllowed = true;
      break;
    }
  }
  if (!isAllowed) {
    console.error(
      [
        "error:access_not_allowed",
        `provider:${provider}`,
        `uid:${uid}`,
        `hub:${sfOrgId}`,
        `username:${username}`,
        `ls:${login}`,
      ].join("\t")
    );
    return {
      success: false,
      status: 403,
      error: "access_not_allowed",
      message: "Access not allowed",
    };
  }

  const token = jsonwebtoken.sign(
    {
      iss: appClientId,
      aud: login === "production" ? SF_LOGIN_URL : SF_SANDBOX_LOGIN_URL,
      sub: username,
      exp: Math.floor(Date.now() / 1000) + 3 * 60,
    },
    appPrivateKey,
    { algorithm: "RS256" }
  );
  const tokenEndpointUrl =
    (login === "production" ? SF_LOGIN_URL : SF_SANDBOX_LOGIN_URL) +
    "/services/oauth2/token";
  const tokenParams = new URLSearchParams();
  tokenParams.append(
    "grant_type",
    "urn:ietf:params:oauth:grant-type:jwt-bearer"
  );
  tokenParams.append("assertion", token);

  try {
    const result = await axios.post<{
      access_token: string;
      instance_url: string;
    }>(tokenEndpointUrl, tokenParams);
    if (result.status !== 200) {
      console.error(
        [
          `error:${result.statusText}`,
          `provider:${provider}`,
          `uid:${uid}`,
          `hub:${sfOrgId}`,
          `username:${username}`,
          `ls:${login}`,
        ].join("\t")
      );
      return {
        success: false,
        status: result.status,
        error: "sf_token_exchange_failed",
        message: result.statusText,
      };
    }
    const { access_token, instance_url } = result.data;
    console.log(
      [
        `status:login_to_org`,
        `provider:${provider}`,
        `uid:${uid}`,
        `hub:${sfOrgId}`,
        `username:${username}`,
        `ls:${login}`,
      ].join("\t")
    );
    const frontdoorUrl = new URL("/secur/frontdoor.jsp", instance_url);
    frontdoorUrl.searchParams.set("sid", access_token);
    if (retURL) {
      frontdoorUrl.searchParams.set("retURL", retURL);
    }
    return {
      success: true,
      frontdoorUrl: frontdoorUrl.toString(),
      instanceUrl: instance_url,
      accessToken: access_token,
    };
  } catch (e) {
    console.error(tokenEndpointUrl, tokenParams);
    console.error((e as any).response?.data);
    const error_description = (e as any).response?.data?.error_description;
    console.error(
      [
        `error:${error_description}`,
        `provider:${provider}`,
        `uid:${uid}`,
        `hub:${sfOrgId}`,
        `username:${username}`,
        `ls:${login}`,
      ].join("\t")
    );
    return {
      success: false,
      status: 500,
      error: "sf_token_exchange_failed",
      message: error_description ?? "Salesforce token exchange failed",
    };
  }
}

/**
 *
 */
declare module "express-session" {
  interface SessionData {
    uid?: string;
    provider?: string;
    isAdmin?: boolean;
    sfOrgId?: string;
    state?: string;
    redirectPath?: string;
  }
}

const app = express();

if (app.get("env") === "production") {
  app.set("trust proxy", 1);
}
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET ?? "secret123",
    cookie: {
      secure: app.get("env") === "production",
      httpOnly: true,
    },
  })
);

/**
 *
 */
app.get("/me", async (req, res) => {
  const { uid, isAdmin } = req.session;
  if (uid == null) {
    res.status(401).json({ errors: [{ message: "User is not logged in" }] });
    return;
  }
  res.json({ uid, isAdmin });
});

/**
 *
 */
app.get("/org", async (req, res) => {
  const { sfOrgId } = req.session;
  if (sfOrgId == null) {
    res
      .status(403)
      .json({ errors: [{ message: "Only Org Admin can access org info" }] });
    return;
  }
  const org = sfOrgId === devHubOrgInfo.sfOrgId ? devHubOrgInfo : null;
  if (!org) {
    res
      .status(404)
      .json({ errors: [{ message: "Organization is not found" }] });
    return;
  }
  res.json(org);
});

/**
 *
 */
app.patch("/org", async (req, res) => {
  res.status(403).json({
    errors: [
      { message: "You cannot modify the org info. Use env variable instead." },
    ],
  });
});

/**
 *
 */
app.delete("/org", async (req, res) => {
  res.status(403).json({
    errors: [{ message: "You cannot delete the org info." }],
  });
});

/**
 *
 */
app.post("/org/allowedList", (req, res) => {
  res.status(403).json({
    errors: [
      {
        message:
          "You cannot add list entry from API. Use env variable instead.",
      },
    ],
  });
});

/**
 *
 */
app.delete("/org/allowedList/:entryId", async (req, res) => {
  res.status(403).json({
    errors: [
      {
        message:
          "You cannot delete list entry from API. Use env variable instead.",
      },
    ],
  });
});

/**
 *
 */
app.get("/auth/salesforce", async (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  req.session.state = state;
  const authzUrl = sfOAuth2.getAuthorizationUrl({
    state,
    prompt: "login",
  });
  res.redirect(authzUrl);
});

/**
 *
 */
app.get(
  "/auth/salesforce/callback",
  async (
    req: Request<{}, {}, {}, { code?: string; state?: string; error?: string }>,
    res
  ) => {
    const { code, state, error } = req.query;
    if (error) {
      res.redirect(`/#error=${error}`);
      return;
    }
    if (req.session.state !== state) {
      res.redirect("/#error=invalid_state");
      return;
    }
    if (!code) {
      res.redirect("/#error=invalid_code");
      return;
    }
    const conn = new Connection({ oauth2: sfOAuth2 });
    const { id: sfUserId, organizationId: sfOrgId } = await conn.authorize(
      code
    );
    const { username } = await conn.identity();
    const setting = await conn.request<{
      userSettings: { canModifyAllData: boolean };
    } | null>("/connect/organization");
    let isAdmin = setting?.userSettings.canModifyAllData ?? false;
    if (isAdmin) {
      if (devHubOrgInfo.sfOrgId === sfOrgId) {
        req.session.sfOrgId = sfOrgId;
      } else {
        isAdmin = false;
      }
    }
    req.session.uid = username;
    req.session.provider = "salesforce";
    req.session.isAdmin = isAdmin;
    const { redirectPath } = req.session;
    res.redirect(redirectPath ?? "/");
  }
);

/**
 *
 */
app.post(
  "/auth/google/callback",
  async (
    req: Request<
      {},
      {},
      {
        g_csrf_token?: string;
        credential?: string;
      }
    >,
    res
  ) => {
    const { g_csrf_token: csrfTokenBody, credential: idToken } = req.body;
    const csrfTokenCookie = req.cookies["g_csrf_token"];
    if (!csrfTokenCookie || csrfTokenBody !== csrfTokenCookie) {
      res.status(400).send("CSRF Token validation error");
      return;
    }
    if (!idToken) {
      res.status(400).send("No ID Token");
      return;
    }
    try {
      const ticket = await glOAuth2.verifyIdToken({
        idToken,
        audience: GL_BACKWINDOW_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      const { email, email_verified } = payload ?? {};
      if (email && email_verified) {
        req.session.uid = email;
        req.session.provider = "google";
        req.session.isAdmin = false;
      }
      const { redirectPath } = req.session;
      res.redirect(redirectPath ?? "/");
    } catch (e) {
      res.status(401).send((e as any).message);
    }
  }
);

/**
 *
 */
app.get("/auth/logout", async (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

/**
 *
 */
app.get(
  "/backwindow",
  async (
    req: Request<
      {},
      {},
      {},
      {
        hub?: string;
        un?: string;
        ls?: string;
        retURL?: string;
      }
    >,
    res
  ) => {
    const {
      hub,
      un,
      ls,
      retURL,
    } = req.query;
    const { uid, provider } = req.session;
    if (!uid || !provider) {
      console.log(
        [
          "status:authentication_required",
          `hub:${hub}`,
          `username:${un}`,
          `ls:${ls ?? "production"}`,
        ].join("\t")
      );
      req.session.redirectPath = req.originalUrl;
      res.redirect("/");
      return;
    }

    if (!hub || !un) {
      res.status(400).send("invalid_backwindow_parameter");
      return;
    }

    const result = await performBackwindowLogin({
      uid,
      provider,
      hub,
      un,
      ls,
      retURL,
    });

    if (!result.success) {
      res.status(result.status).send(result.error);
      return;
    }

    const loginUrl = result.instanceUrl + "/secur/frontdoor.jsp";
    res.contentType("html").send(`
      <html><body onload="document.form1.submit()">
        <form name="form1" method="POST" action="${loginUrl}">
          <input type="hidden" name="sid" value="${result.accessToken}" />
          ${
            retURL
              ? `<input type="hidden" name="retURL" value="${retURL}" />`
              : ""
          }
        </form>
      </body></html>
    `);
  }
);

/**
 *
 */
app.post(
  "/api/backwindow",
  async (
    req: Request<
      {},
      {},
      {
        hub?: string;
        un?: string;
        ls?: string;
        retURL?: string;
      }
    >,
    res
  ) => {
    const authResult = await authenticateApiRequest(req);
    if ("error" in authResult) {
      res
        .status(authResult.status)
        .json({ error: authResult.error, message: authResult.message });
      return;
    }

    const { uid, provider } = authResult;
    const { hub, un, ls, retURL } = req.body;

    if (!hub || !un) {
      res.status(400).json({
        error: "invalid_backwindow_parameter",
        message: "Both 'hub' and 'un' parameters are required",
      });
      return;
    }

    const result = await performBackwindowLogin({
      uid,
      provider,
      hub,
      un,
      ls,
      retURL,
    });

    if (!result.success) {
      res
        .status(result.status)
        .json({ error: result.error, message: result.message });
      return;
    }

    res
      .set("Cache-Control", "no-store")
      .json({ frontdoorUrl: result.frontdoorUrl });
  }
);

app.listen(process.env.PORT ?? 3000);
