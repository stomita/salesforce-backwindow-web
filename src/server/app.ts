import crypto from "crypto";
import express, { Request } from "express";
import session, { SessionData } from "express-session";
import cookieParser from "cookie-parser";
import jsonwebtoken from "jsonwebtoken";
import axios from "axios";
import { PrismaClient } from "@prisma/client";
import { Connection, OAuth2 as SfOAuth2 } from "jsforce";
import { OAuth2Client as GlOAuth2Client } from "google-auth-library";

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

const sfOAuth2 = new SfOAuth2({
  loginUrl: SF_LOGIN_URL,
  clientId: SF_BACKWINDOW_CLIENT_ID,
  clientSecret: SF_BACKWINDOW_CLIENT_SECRET,
  redirectUri: SF_BACKWINDOW_REDIRECT_URI,
});
const glOAuth2 = new GlOAuth2Client(GL_BACKWINDOW_CLIENT_ID);

const prisma = new PrismaClient();

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
      .json({ errors: [{ message: "Only HubOrg admin can access org info" }] });
    return;
  }
  const org = await prisma.org.findUnique({
    select: {
      id: true,
      appClientId: true,
      allowedList: true,
    },
    where: { sfOrgId },
  });
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
app.patch(
  "/org",
  async (
    req: Request<
      {},
      {},
      {
        appClientId?: string;
        appPrivateKey?: string;
      }
    >,
    res
  ) => {
    const { appClientId, appPrivateKey } = req.body;
    const { sfOrgId } = req.session;
    if (sfOrgId == null) {
      res.status(403).json({
        errors: [{ message: "Only HubOrg admin can access org info" }],
      });
      return;
    }
    const org = await prisma.org.findUnique({
      where: { sfOrgId },
      include: { allowedList: true },
    });
    if (!org) {
      res
        .status(404)
        .json({ errors: [{ message: "Organization is not found" }] });
      return;
    }
    const uorg = await prisma.org.update({
      data: {
        ...(appClientId ? { appClientId } : {}),
        ...(appPrivateKey ? { appPrivateKey } : {}),
      },
      where: { id: org.id },
    });
    res.json(uorg);
  }
);

/**
 *
 */
app.post(
  "/org/allowedList",
  async (req: Request<{}, {}, { provider?: string; email?: string }>, res) => {
    const { sfOrgId } = req.session;
    if (sfOrgId == null) {
      res.status(403).json({
        errors: [{ message: "Only HubOrg admin can access org info" }],
      });
      return;
    }
    const { provider, email } = req.body;
    if (!provider || !email) {
      res
        .status(400)
        .json({ errors: [{ message: "Email is not found in input" }] });
      return;
    }
    const org = await prisma.org.findUnique({
      where: { sfOrgId },
    });
    if (!org) {
      res
        .status(404)
        .json({ errors: [{ message: "Organization is not found" }] });
      return;
    }
    const entry = await prisma.allowedEntry.create({
      data: {
        orgId: org.id,
        provider,
        email: email.trim(),
      },
    });
    res.json(entry);
  }
);

/**
 *
 */
app.delete(
  "/org/allowedList/:entryId",
  async (req: Request<{ entryId: string }>, res) => {
    const { sfOrgId } = req.session;
    const { entryId: entryIdStr } = req.params;
    const entryId = Number(entryIdStr);
    if (Number.isNaN(entryId)) {
      res.status(404).json({ errors: [{ message: "Invalid entry id" }] });
      return;
    }
    if (sfOrgId == null) {
      res.status(403).json({
        errors: [{ message: "Only HubOrg admin can access org info" }],
      });
      return;
    }
    const org = await prisma.org.findUnique({
      where: { sfOrgId },
    });
    if (!org) {
      res
        .status(404)
        .json({ errors: [{ message: "Organization is not found" }] });
      return;
    }
    const entry = await prisma.allowedEntry.findUnique({
      select: {
        id: true,
        org: {
          select: {
            sfOrgId: true,
          },
        },
      },
      where: {
        id: entryId,
      },
    });
    if (!entry || entry.org.sfOrgId !== sfOrgId) {
      res.status(404).json({ errors: [{ message: "Entry is not found" }] });
      return;
    }
    await prisma.allowedEntry.delete({ where: { id: entry.id } });
    res.status(204).end();
  }
);

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
    let isDevhub = false;
    try {
      await conn.sobject("ScratchOrgInfo").describe();
      isDevhub = true;
    } catch (e) {
      // skip
    }
    const setting = await conn.request<{
      userSettings: { canModifyAllData: boolean };
    } | null>("/connect/organization");
    let isAdmin = (isDevhub && setting?.userSettings.canModifyAllData) ?? false;
    if (isAdmin) {
      let org = await prisma.org.findUnique({
        where: { sfOrgId },
      });
      if (!org) {
        org = await prisma.org.create({
          data: {
            sfOrgId,
            sfUserId,
          },
        });
      }
      if (!org) {
        res.redirect("/#error=org_creation_failure");
        return;
      }
      if (org?.sfUserId !== sfUserId) {
        isAdmin = false;
      }
      req.session.sfOrgId = sfOrgId;
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
      }
    >,
    res
  ) => {
    const { hub: sfOrgId, un: username, ls: login = "production" } = req.query;
    const { uid, provider } = req.session;
    if (!uid || !provider) {
      req.session.redirectPath = req.originalUrl;
      res.redirect("/");
      return;
    }
    if (!sfOrgId || !username) {
      res.status(400).send("invalid_backwindow_parameter");
      return;
    }
    const org = await prisma.org.findUnique({
      where: { sfOrgId },
      include: { allowedList: true },
    });
    if (!org) {
      res.status(404).send("hub_org_not_found");
      return;
    }
    const { appClientId, appPrivateKey, allowedList } = org;
    if (!appClientId || !appPrivateKey) {
      res.status(500).send("invalid_connected_app_config");
      return;
    }
    let isAllowed = false;
    for (const entry of allowedList) {
      if (entry.email === uid && entry.provider === provider) {
        isAllowed = true;
        break;
      }
    }
    if (!isAllowed) {
      res.status(403).send("access_not_allowed");
      return;
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
    const params = new URLSearchParams();
    params.append("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
    params.append("assertion", token);
    try {
      const result = await axios.post<{
        access_token: string;
        instance_url: string;
      }>(tokenEndpointUrl, params);
      if (result.status !== 200) {
        res.status(result.status).send(result.statusText);
        return;
      }
      const { access_token, instance_url } = result.data;
      const loginUrl =
        instance_url + "/secur/frontdoor.jsp?sid=" + access_token;
      res.redirect(loginUrl);
    } catch (e) {
      console.error((e as any).response?.data);
      res.status(500).send((e as any).response?.data?.error_description);
      return;
    }
  }
);

app.listen(process.env.PORT ?? 3000);
