import React, { useEffect, useState } from "react";
import { Button } from "./common/Button";
import { Card } from "./common/Card";
import { FormElement } from "./common/FormElement";

/**
 *
 */
type AppProps = {
  path?: string;
  userId?: string;
  error?: string;
  onLogout?: () => void;
};

/**
 *
 */
const AppHeader = (props: AppProps) => {
  const { userId } = props;
  return (
    <header className="slds-global-header_container">
      <div className="slds-global-header slds-grid slds-grid_align-spread">
        <div className="slds-global-header__item">
          <div className="slds-global-header__logo">
            <span className="slds-assistive-text">Salesforce</span>
          </div>
        </div>
        <div className="slds-global-header__item">
          <ul className="slds-global-actions">
            {userId ? (
              <li className="slds-global-actions__item">
                Logged in as: {userId} |
              </li>
            ) : undefined}
            <li className="slds-global-actions__item">Home</li>
            <li className="slds-global-actions__item">
              |{" "}
              <a
                href="https://github.com/stomita/salesforce-backwindow-web"
                title="GitHub"
                target="_blank"
              >
                GitHub
              </a>
            </li>
            {userId ? (
              <li className="slds-global-actions__item">
                |{" "}
                <a href="/auth/logout" title="Logout">
                  Logout
                </a>
              </li>
            ) : undefined}
          </ul>
        </div>
      </div>
    </header>
  );
};

/**
 *
 */
const AppContent = (props: AppProps) => {
  return (
    <div style={{ padding: 80 }}>
      <HomePage {...props} />
    </div>
  );
};

/**
 *
 */
const HomePage = (props: AppProps) => {
  const { userId } = props;
  return userId ? <HomeScreen {...props} /> : <UserLoginPrompt {...props} />;
};

const GoogleLoginButton = () => {
  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    document.body.appendChild(s);
  }, []);
  return (
    <div className="slds-p-vertical_small">
      <div
        id="g_id_onload"
        data-client_id={process.env.GL_BACKWINDOW_CLIENT_ID}
        data-login_uri={process.env.GL_BACKWINDOW_REDIRECT_URI}
        data-auto_prompt="false"
        data-ux_mode="redirect"
      ></div>
      <div
        className="g_id_signin"
        data-type="standard"
        data-size="large"
        data-theme="outline"
        data-text="sign_in_with"
        data-shape="rectangular"
        data-logo_alignment="left"
      ></div>
    </div>
  );
};

const UserLoginPrompt = (props: AppProps) => {
  return (
    <Card icon="user" title="Login">
      <div className="slds-p-around_large slds-align_absolute-center">
        <div>
          <GoogleLoginButton />
        </div>
      </div>
    </Card>
  );
};

/**
 *
 */
const HomeScreen = (props: AppProps) => (
  <>
    <BackwindowUsage />
    <BackwindowUrlGenerator {...props} />
  </>
);

/**
 *
 */
const BackwindowUsage = () => (
  <Card title="Welcome to Backwindow">
    <p className="slds-m-vertical_small">
      Backwindow is a secure login service to access Salesforce orgs without
      sharing any credentials or passwords, using JWT grant.
    </p>
    <p className="slds-m-vertical_small">
      Backwindow is secure because it does not persistently expose credential
      information, unlike sharing URL with the Salesforce CLI `force:org:open`
      command (a.k.a frontdoor.jsp URL). Only registered users can get login
      access to the orgs which accept JWT bearer auth.
    </p>
    <p className="slds-m-vertical_small">
      In order to get login access to orgs, open the URL with following
      parameters:
    </p>
    <div className="slds-box slds-box_x-small">
      {location.origin}/backwindow?un=&#123;username&#125;&ls=&#123;"production"
      or "sandbox"&#125;
    </div>
  </Card>
);

/**
 *
 */
const BackwindowUrlGenerator = (props: AppProps) => {
  const [username, setUsername] = useState("");
  const [loginServer, setLoginServer] = useState("sandbox");
  const params = new URLSearchParams();
  params.append("un", username);
  params.append("ls", loginServer);
  const backwindowUrl = `${location.origin}/backwindow?${params.toString()}`;
  const valid = username && username.indexOf("@") > 0;
  return (
    <Card title="URL Generator">
      <FormElement label="Login Username (e.g. test-123456789@example.com)">
        <input
          type="text"
          className="slds-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </FormElement>
      <FormElement label="Environment">
        <select
          className="slds-input"
          value={loginServer}
          onChange={(e) => setLoginServer(e.target.value)}
        >
          <option value="production">Production</option>
          <option value="sandbox">Sandbox</option>
        </select>
      </FormElement>
      <FormElement
        className="slds-p-vertical_medium"
        label="Backwindow Login URL"
      >
        <div className="slds-box slds-box_x-small">
          {valid ? <a href={backwindowUrl}>{backwindowUrl}</a> : backwindowUrl}
        </div>
      </FormElement>
    </Card>
  );
};

/**
 *
 */
const AppToast = (props: AppProps) => {
  const [hidden, setHidden] = useState(false);
  return props.error && !hidden ? (
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%" }}>
      <div className="slds-notify_container slds-is-relative">
        <div
          className="slds-notify slds-notify_toast slds-theme_error"
          role="status"
        >
          <span className="slds-assistive-text">error</span>
          <span className="slds-icon_container slds-icon-utility-error slds-m-right_small slds-no-flex slds-align-top">
            <svg className="slds-icon slds-icon_small" aria-hidden="true">
              <use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#error"></use>
            </svg>
          </span>
          <div className="slds-notify__content">
            <h2 className="slds-text-heading_small ">{props.error}</h2>
          </div>
          <div className="slds-notify__close">
            <Button
              variant="icon"
              className="slds-button_icon-inverse"
              title="Close"
              icon="close"
              onClick={() => setHidden(true)}
            />
          </div>
        </div>
      </div>
    </div>
  ) : (
    <></>
  );
};

export const AppLoading = () => (
  <div role="status" className="slds-spinner slds-spinner_medium">
    <span className="slds-assistive-text">Loading</span>
    <div className="slds-spinner__dot-a"></div>
    <div className="slds-spinner__dot-b"></div>
  </div>
);

export const App = (props: AppProps) => {
  return (
    <>
      <AppHeader {...props} />
      <AppContent {...props} />
      <AppToast {...props} />
    </>
  );
};
