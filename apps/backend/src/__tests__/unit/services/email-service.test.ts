import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import type { Resend } from "resend";
import { ResendEmailService } from "../../../infrastructure/services/email-service";
import { config } from "../../../infrastructure/config";
import { logger } from "../../../infrastructure/logger";
import type { ConfigProvider } from "../../../infrastructure/services/config-provider";

type SendPayload = { from: string; to: string; subject: string; html: string };
type SendResult = { data: unknown; error: { message: string } | null };
type SendFn = (payload: SendPayload) => Promise<SendResult>;

type ResendStub = { client: Resend; from: string } | null;

class TestableEmailService extends ResendEmailService {
  private readonly stub: ResendStub;
  constructor(stub: ResendStub, configProvider?: ConfigProvider) {
    super(configProvider);
    this.stub = stub;
  }
  protected async getResend(): Promise<ResendStub> {
    return this.stub;
  }
}

function makeFakeClient(sendImpl: SendFn): { client: Resend; sendMock: ReturnType<typeof mock.fn> } {
  const sendMock = mock.fn(sendImpl);
  const client = { emails: { send: sendMock } } as unknown as Resend;
  return { client, sendMock };
}

function makeSuccessClient(): { client: Resend; sendMock: ReturnType<typeof mock.fn> } {
  return makeFakeClient(async () => ({ data: { id: "msg-1" }, error: null }));
}

type FakeConfigProvider = ConfigProvider & {
  getCalls: string[];
  store: Map<string, string>;
};

function makeConfigProvider(initial: Record<string, string> = {}): FakeConfigProvider {
  const store = new Map<string, string>(Object.entries(initial));
  const getCalls: string[] = [];
  return {
    store,
    getCalls,
    async get(key: string) {
      getCalls.push(key);
      return store.get(key) ?? "";
    },
    invalidate() {},
  } as unknown as FakeConfigProvider;
}

const ORIGINAL_CONFIG = {
  frontendUrl: config.frontendUrl,
  resendApiKey: config.resendApiKey,
  fromEmail: config.fromEmail,
};

type ConfigMut = { frontendUrl: string; resendApiKey: string; fromEmail: string };
const mutableConfig = config as unknown as ConfigMut;

beforeEach(() => {
  Object.assign(mutableConfig, {
    frontendUrl: "https://app.example.test",
    resendApiKey: "",
    fromEmail: "noreply@drawhaus.app",
  });
});

afterEach(() => {
  mock.restoreAll();
  Object.assign(mutableConfig, ORIGINAL_CONFIG);
});

describe("ResendEmailService.sendInviteEmail", () => {
  it("forwards `to`, builds subject with instanceName, and sends exactly once", async () => {
    const { client, sendMock } = makeSuccessClient();
    mock.method(logger, "info", () => {});
    const service = new TestableEmailService({ client, from: "noreply@example.test" });

    await service.sendInviteEmail("user@example.com", "tok-123", "Alice", "Acme Inc");

    assert.equal(sendMock.mock.calls.length, 1);
    const payload = sendMock.mock.calls[0].arguments[0] as SendPayload;
    assert.equal(payload.to, "user@example.com");
    assert.equal(payload.from, "noreply@example.test");
    assert.equal(payload.subject, "You've been invited to Acme Inc");
  });

  it("embeds the invite URL with `/invite/<token>` against the configured frontendUrl", async () => {
    const { client, sendMock } = makeSuccessClient();
    mock.method(logger, "info", () => {});
    const service = new TestableEmailService({ client, from: "noreply@example.test" });

    await service.sendInviteEmail("user@example.com", "tok-abc", "Alice", "Acme");

    const payload = sendMock.mock.calls[0].arguments[0] as SendPayload;
    assert.match(payload.html, /href="https:\/\/app\.example\.test\/invite\/tok-abc"/);
  });

  it("interpolates inviterName and instanceName into the HTML body", async () => {
    const { client, sendMock } = makeSuccessClient();
    mock.method(logger, "info", () => {});
    const service = new TestableEmailService({ client, from: "noreply@example.test" });

    await service.sendInviteEmail("user@example.com", "t", "Alice", "Acme");

    const payload = sendMock.mock.calls[0].arguments[0] as SendPayload;
    assert.match(payload.html, /<strong>Alice<\/strong>/);
    assert.match(payload.html, /<strong>Acme<\/strong>/);
    assert.match(payload.html, /Sent by Acme/);
  });

  it("XSS: inviterName is interpolated unescaped, allowing HTML injection into the email body", async () => {
    const { client, sendMock } = makeSuccessClient();
    mock.method(logger, "info", () => {});
    const service = new TestableEmailService({ client, from: "noreply@example.test" });

    const malicious = '</strong><a href="https://evil.example.com">Click here</a><strong>';
    await service.sendInviteEmail("user@example.com", "t", malicious, "Acme");

    const payload = sendMock.mock.calls[0].arguments[0] as SendPayload;
    assert.ok(payload.html.includes('<a href="https://evil.example.com">Click here</a>'),
      "raw <a> tag should appear in the HTML — confirms inviterName is not escaped");
  });
});

describe("ResendEmailService.sendWorkspaceInviteEmail", () => {
  it("forwards `to`, builds subject with workspaceName, and sends exactly once", async () => {
    const { client, sendMock } = makeSuccessClient();
    mock.method(logger, "info", () => {});
    const service = new TestableEmailService({ client, from: "noreply@example.test" });

    await service.sendWorkspaceInviteEmail("invitee@example.com", "wtok-1", "Bob", "Design Team");

    assert.equal(sendMock.mock.calls.length, 1);
    const payload = sendMock.mock.calls[0].arguments[0] as SendPayload;
    assert.equal(payload.to, "invitee@example.com");
    assert.equal(payload.subject, 'You\'ve been invited to the "Design Team" workspace');
  });

  it("embeds the workspace-invite URL with `/workspace-invite/<token>`", async () => {
    const { client, sendMock } = makeSuccessClient();
    mock.method(logger, "info", () => {});
    const service = new TestableEmailService({ client, from: "noreply@example.test" });

    await service.sendWorkspaceInviteEmail("invitee@example.com", "wtok-xyz", "Bob", "Design Team");

    const payload = sendMock.mock.calls[0].arguments[0] as SendPayload;
    assert.match(payload.html, /href="https:\/\/app\.example\.test\/workspace-invite\/wtok-xyz"/);
  });

  it("interpolates inviterName and workspaceName into the HTML body", async () => {
    const { client, sendMock } = makeSuccessClient();
    mock.method(logger, "info", () => {});
    const service = new TestableEmailService({ client, from: "noreply@example.test" });

    await service.sendWorkspaceInviteEmail("invitee@example.com", "t", "Bob", "Design Team");

    const payload = sendMock.mock.calls[0].arguments[0] as SendPayload;
    assert.match(payload.html, /<strong>Bob<\/strong>/);
    assert.match(payload.html, /<strong>Design Team<\/strong>/);
  });

  it("XSS: workspaceName is interpolated unescaped (subject and body)", async () => {
    const { client, sendMock } = makeSuccessClient();
    mock.method(logger, "info", () => {});
    const service = new TestableEmailService({ client, from: "noreply@example.test" });

    const malicious = '<img src=x onerror=alert(1)>';
    await service.sendWorkspaceInviteEmail("invitee@example.com", "t", "Bob", malicious);

    const payload = sendMock.mock.calls[0].arguments[0] as SendPayload;
    assert.ok(payload.html.includes(malicious),
      "malicious workspaceName must appear unescaped in HTML — XSS surface");
    assert.ok(payload.subject.includes(malicious),
      "malicious workspaceName must appear unescaped in the subject too");
  });
});

describe("ResendEmailService.sendPasswordResetEmail", () => {
  it("uses the fixed 'Reset your password' subject and sends exactly once", async () => {
    const { client, sendMock } = makeSuccessClient();
    mock.method(logger, "info", () => {});
    const service = new TestableEmailService({ client, from: "noreply@example.test" });

    await service.sendPasswordResetEmail("user@example.com", "reset-tok-1");

    assert.equal(sendMock.mock.calls.length, 1);
    const payload = sendMock.mock.calls[0].arguments[0] as SendPayload;
    assert.equal(payload.to, "user@example.com");
    assert.equal(payload.subject, "Reset your password");
  });

  it("embeds the reset URL with `/reset-password/<token>`", async () => {
    const { client, sendMock } = makeSuccessClient();
    mock.method(logger, "info", () => {});
    const service = new TestableEmailService({ client, from: "noreply@example.test" });

    await service.sendPasswordResetEmail("user@example.com", "reset-tok-abc");

    const payload = sendMock.mock.calls[0].arguments[0] as SendPayload;
    assert.match(payload.html, /href="https:\/\/app\.example\.test\/reset-password\/reset-tok-abc"/);
  });

  it("body contains the reset-your-password copy and a 1-hour expiry note", async () => {
    const { client, sendMock } = makeSuccessClient();
    mock.method(logger, "info", () => {});
    const service = new TestableEmailService({ client, from: "noreply@example.test" });

    await service.sendPasswordResetEmail("user@example.com", "tok");

    const payload = sendMock.mock.calls[0].arguments[0] as SendPayload;
    assert.match(payload.html, /Reset your password/);
    assert.match(payload.html, /expires in 1 hour/);
  });
});

describe("ResendEmailService — send orchestration", () => {
  it("on success, logs 'Email sent successfully' at info level", async () => {
    const { client, sendMock } = makeSuccessClient();
    const infoMock = mock.method(logger, "info", () => {});
    const service = new TestableEmailService({ client, from: "noreply@example.test" });

    await service.sendPasswordResetEmail("user@example.com", "t");

    assert.equal(sendMock.mock.calls.length, 1);
    const successCall = infoMock.mock.calls.find(
      (c) => c.arguments[1] === "Email sent successfully",
    );
    assert.ok(successCall, "must log 'Email sent successfully' on success");
    const meta = successCall.arguments[0] as { to: string; subject: string };
    assert.equal(meta.to, "user@example.com");
    assert.equal(meta.subject, "Reset your password");
  });

  it("when getResend returns null, logs at info level and returns without throwing", async () => {
    const sendShouldNotBeCalled = mock.fn();
    const infoMock = mock.method(logger, "info", () => {});
    const service = new TestableEmailService(null);

    await service.sendPasswordResetEmail("user@example.com", "tok-1");

    assert.equal(sendShouldNotBeCalled.mock.calls.length, 0);
    const noKeyCall = infoMock.mock.calls.find((c) =>
      typeof c.arguments[1] === "string" &&
      (c.arguments[1] as string).includes("No RESEND_API_KEY set"),
    );
    assert.ok(noKeyCall, "must log a 'no api key' message at info level");
    const meta = noKeyCall.arguments[0] as { to: string; subject: string; actionUrl: string };
    assert.equal(meta.to, "user@example.com");
    assert.equal(meta.subject, "Reset your password");
    assert.match(meta.actionUrl, /\/reset-password\/tok-1$/);
  });

  it("when Resend returns an error, logs at error level and throws with the error message", async () => {
    const { client } = makeFakeClient(async () => ({
      data: null,
      error: { message: "Invalid API key" },
    }));
    mock.method(logger, "info", () => {});
    const errorMock = mock.method(logger, "error", () => {});
    const service = new TestableEmailService({ client, from: "noreply@example.test" });

    await assert.rejects(
      () => service.sendPasswordResetEmail("user@example.com", "t"),
      (err: unknown) =>
        err instanceof Error && err.message === "Failed to send email: Invalid API key",
    );
    assert.equal(errorMock.mock.calls.length, 1);
    const [meta, msg] = errorMock.mock.calls[0].arguments as [
      { to: string; subject: string; error: { message: string } },
      string,
    ];
    assert.equal(meta.to, "user@example.com");
    assert.equal(meta.error.message, "Invalid API key");
    assert.match(msg, /Failed to send email via Resend/);
  });
});

describe("ResendEmailService.getResend — resolution paths", () => {
  it("with configProvider: reads RESEND_API_KEY and FROM_EMAIL via the provider", async () => {
    const provider = makeConfigProvider({
      RESEND_API_KEY: "re_test_key",
      FROM_EMAIL: "configured@example.test",
    });
    const service = new ResendEmailService(provider);

    const resolved = await (service as unknown as {
      getResend: () => Promise<{ client: Resend; from: string } | null>;
    }).getResend();

    assert.ok(resolved);
    assert.equal(resolved.from, "configured@example.test");
    assert.deepEqual(provider.getCalls, ["RESEND_API_KEY", "FROM_EMAIL"]);
  });

  it("without configProvider: falls back to config.resendApiKey and config.fromEmail", async () => {
    mutableConfig.resendApiKey = "re_env_key";
    mutableConfig.fromEmail = "env@example.test";
    const service = new ResendEmailService();

    const resolved = await (service as unknown as {
      getResend: () => Promise<{ client: Resend; from: string } | null>;
    }).getResend();

    assert.ok(resolved);
    assert.equal(resolved.from, "env@example.test");
  });

  it("returns null when the api key is empty (configProvider path)", async () => {
    const provider = makeConfigProvider({ RESEND_API_KEY: "", FROM_EMAIL: "x@example.test" });
    const service = new ResendEmailService(provider);

    const resolved = await (service as unknown as {
      getResend: () => Promise<{ client: Resend; from: string } | null>;
    }).getResend();

    assert.equal(resolved, null);
  });

  it("returns null when the api key is empty (env fallback path)", async () => {
    mutableConfig.resendApiKey = "";
    const service = new ResendEmailService();

    const resolved = await (service as unknown as {
      getResend: () => Promise<{ client: Resend; from: string } | null>;
    }).getResend();

    assert.equal(resolved, null);
  });

  it("falls back to 'noreply@drawhaus.app' when FROM_EMAIL is empty via configProvider", async () => {
    const provider = makeConfigProvider({ RESEND_API_KEY: "re_test_key", FROM_EMAIL: "" });
    const service = new ResendEmailService(provider);

    const resolved = await (service as unknown as {
      getResend: () => Promise<{ client: Resend; from: string } | null>;
    }).getResend();

    assert.ok(resolved);
    assert.equal(resolved.from, "noreply@drawhaus.app");
  });
});
