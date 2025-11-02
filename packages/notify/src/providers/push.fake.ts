import { randomBytes } from "crypto";
import type { PushProvider, PushResult } from "../types";

export class FakePushProvider implements PushProvider {
  kind: "fake-push" = "fake-push";

  async sendPush(params: {
    toToken: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<PushResult> {
    const fakeMessageId = `fake_push_${randomBytes(12).toString("hex")}`;

    console.log(
      `[FAKE PUSH] To: ${params.toToken}, Title: ${params.title}, Body: ${params.body}`
    );

    return {
      messageId: fakeMessageId,
      status: "sent",
    };
  }
}
