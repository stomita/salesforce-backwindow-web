import React, {
  KeyboardEvent,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { genid } from "../util";
import { Button } from "./common/Button";
import { Card } from "./common/Card";
import { FormElement } from "./common/FormElement";

/**
 *
 */
type AppProps = {
  path?: string;
  userId?: string;
  isAdmin?: boolean;
  error?: string;
  appId?: string;
  allowedEntryList?: Array<{ id: number; email: string }>;
  onDeleteAllowedEntry: (id: number) => void;
  onCreateAllowedEntry: (email: string) => void;
  onUpdateConnectedApp: (params: {
    appId: string;
    privateKey?: string;
  }) => void;
  onLogin?: () => void;
  onLogout?: () => void;
};

/**
 *
 */
const AppHeader = (props: AppProps) => {
  const { path, userId } = props;
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
            <li className="slds-global-actions__item">
              {path === "/" ? (
                "Home"
              ) : (
                <a href="/" title="Admin">
                  Home
                </a>
              )}
            </li>
            <li className="slds-global-actions__item">
              |{" "}
              {path === "/admin/" ? (
                "Admin"
              ) : (
                <a href="/admin/" title="Admin">
                  Admin
                </a>
              )}
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
  const { path } = props;
  return (
    <div style={{ padding: 80 }}>
      {path === "/" ? (
        <HomePage {...props} />
      ) : path === "/admin/" ? (
        <AdminPage {...props} />
      ) : (
        <></>
      )}
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

/**
 *
 */
const AdminPage = (props: AppProps) => {
  const { userId, isAdmin } = props;
  return userId ? (
    isAdmin ? (
      <AdminControlScreen {...props} />
    ) : (
      <AccessWarning />
    )
  ) : (
    <AdminLoginPrompt {...props} />
  );
};

const SalesforceLoginButton = ({ onLogin }: AppProps) => (
  <div className="slds-p-vertical_small">
    <Button variant="brand" icon="salesforce1" onClick={onLogin}>
      Sign in with Salesforce
    </Button>
  </div>
);

const GoogleLoginButton = () => (
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

const AdminLoginPrompt = (props: AppProps) => {
  return (
    <Card icon="user" title="Login with HubOrg Account">
      <div className="slds-p-around_large slds-align_absolute-center">
        <SalesforceLoginButton {...props} />
      </div>
    </Card>
  );
};

/**
 *
 */
const UserLoginPrompt = (props: AppProps) => {
  return (
    <Card icon="user" title="Login">
      <div className="slds-p-around_large slds-align_absolute-center">
        <div>
          <GoogleLoginButton />
          <SalesforceLoginButton {...props} />
        </div>
      </div>
    </Card>
  );
};

/**
 *
 */
const AdminControlScreen = (props: AppProps) => {
  return (
    <>
      <ConnectedAppControl {...props} />
      <AllowedUserList {...props} />
    </>
  );
};

/**
 *
 */
const ConnectedAppControl = (props: AppProps) => {
  const { appId: appId_, onUpdateConnectedApp } = props;
  const clientIdInputId = useRef(genid()).current;
  const privateKeyInputId = useRef(genid()).current;
  const [appId, setAppId] = useState(appId_ ?? "");
  const [editing, setEditing] = useState(false);
  const [privateKey, setPrivateKey] = useState("");
  const onSave = useCallback(() => {
    if (appId) {
      onUpdateConnectedApp({ appId, privateKey: privateKey ?? undefined });
      setEditing(false);
    }
  }, [appId, privateKey]);
  useEffect(() => {
    setAppId(appId_ ?? "");
  }, [appId_]);
  return (
    <Card
      icon="settings"
      title="Connected App Setting"
      footer={
        editing ? (
          <Button variant="brand" disabled={!appId} onClick={onSave}>
            Save
          </Button>
        ) : (
          <Button variant="neutral" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )
      }
    >
      <FormElement id={clientIdInputId} label="Connected App Client ID">
        {editing ? (
          <input
            type="text"
            className="slds-input"
            id={clientIdInputId}
            placeholder="Input Connected App Client ID"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
          />
        ) : (
          appId
        )}
      </FormElement>
      <FormElement id={privateKeyInputId} label="JWT Private Key File">
        {editing ? (
          <textarea
            id={privateKeyInputId}
            className="slds-input"
            placeholder="Copy and paste the private key information from file to auth in JWT grant"
            onChange={(e) => setPrivateKey(e.target.value)}
          />
        ) : (
          "(not shown in display)"
        )}
      </FormElement>
    </Card>
  );
};

/**
 *
 */
const AllowedUserList = (props: AppProps) => {
  const {
    allowedEntryList = [],
    onCreateAllowedEntry,
    onDeleteAllowedEntry,
  } = props;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.keyCode === 13) {
        const inputEl = inputRef.current;
        if (inputEl) {
          const email = inputEl.value;
          inputEl.value = "";
          onCreateAllowedEntry(email);
        }
      }
    },
    [onCreateAllowedEntry]
  );
  return (
    <Card icon="user" title="Allowed Users">
      {allowedEntryList.map((entry) => (
        <div
          key={entry.email}
          className="slds-p-left_small slds-p-vertical_x-small"
        >
          <span>{entry.email}</span>
          <Button
            className="slds-m-left_small"
            variant="icon"
            icon="clear"
            title="Remove Entry"
            onClick={() => onDeleteAllowedEntry(entry.id)}
          />
        </div>
      ))}
      <div className="slds-p-vertical_x-small">
        <input
          ref={inputRef}
          className="slds-input"
          type="text"
          placeholder="Add User's email who can access to Scratch orgs through backwindow"
          onKeyDown={onKeyDown}
        />
      </div>
    </Card>
  );
};

/**
 *
 */
const AccessWarning = () => {
  return (
    <Card title="Access Not Allowed">
      Only the first user who logged in as DevHub org admin can edit backwindow
      configs and accessible users.
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
      Backwindow is a secure login service to access multiple Salesforce orgs
      without sharing any credentials or passwords, using JWT grant.
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
      {location.origin}/backwindow?hub=&#123;devhub org
      id&#125;&un=&#123;username&#125;&ls=&#123;"production" or "sandbox"&#125;
    </div>
  </Card>
);

/**
 *
 */
const BackwindowUrlGenerator = (props: AppProps) => {
  const [hubOrgId, setHubOrgId] = useState("");
  const [username, setUsername] = useState("");
  const [loginServer, setLoginServer] = useState("sandbox");
  const params = new URLSearchParams();
  params.append("hub", hubOrgId);
  params.append("un", username);
  params.append("ls", loginServer);
  const backwindowUrl = `${location.origin}/backwindow?${params.toString()}`;
  const valid = hubOrgId.length === 18 && hubOrgId.startsWith('00D') && username && username.indexOf('@') > 0;
  return (
    <Card title="URL generator">
      <FormElement label="DevHub Org ID (18 chars)">
        <input
          type="text"
          className="slds-input"
          value={hubOrgId}
          onChange={(e) => setHubOrgId(e.target.value)}
        />
      </FormElement>
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
      <FormElement className="slds-p-vertical_medium" label="Backwindow Login URL">
        <div className="slds-box slds-box_x-small">
          {valid ? <a href={ backwindowUrl}>{backwindowUrl}</a> : backwindowUrl}
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

export const App = (props: AppProps) => {
  return (
    <>
      <AppHeader {...props} />
      <AppContent {...props} />
      <AppToast {...props} />
    </>
  );
};
