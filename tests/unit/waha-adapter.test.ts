import { createHmac } from "node:crypto";
import { describe, it, expect } from "vitest";
import { normalizeWahaMessage, verifyWahaHmac } from "@/server/waha/adapter";
import { contactChatId } from "@/server/waha/config";

describe("WAHA", () => {
  const secret="very-long-test-webhook-secret";
  it("verifica assinatura HMAC-SHA512",()=>{
    const payload='{"event":"message"}';
    const signature=createHmac("sha512",secret).update(payload).digest("hex");
    expect(verifyWahaHmac(payload,signature,secret)).toBe(true);
    expect(verifyWahaHmac(payload,"0".repeat(128),secret)).toBe(false);
    expect(verifyWahaHmac(payload,null,secret)).toBe(false);
  });
  it("registra mensagem do numero correto",()=>{
    const msg=normalizeWahaMessage({
      event:"message",session:"vocero",
      payload:{id:"a1",from:"5569999999999@c.us",body:"Oi",timestamp:1729000000}
    },"vocero");
    expect(msg?.identity.phone).toBe("5569999999999");
    expect(msg?.waMessageId).toBe("waha:vocero:a1");
  });
  it("ignora grupos, ecos e sessoes estranhas",()=>{
    expect(normalizeWahaMessage({event:"message",session:"outra",
      payload:{id:"a",from:"5569999999999@c.us",body:"oi"}},"vocero")).toBeNull();
    expect(normalizeWahaMessage({event:"message",session:"vocero",
      payload:{id:"a",from:"5569999999999@g.us",body:"oi"}},"vocero")).toBeNull();
    expect(normalizeWahaMessage({event:"message",session:"vocero",
      payload:{id:"a",fromMe:true,from:"5569999999999@c.us",body:"oi"}},"vocero")).toBeNull();
  });
  it("preserva a identidade LID",()=>{
    const msg=normalizeWahaMessage({event:"message",session:"vocero",
      payload:{id:"a",from:"123456@lid",body:"oi"}},"vocero");
    expect(msg?.identity.waUserId).toBe("123456@lid");
    expect(contactChatId({phone:null,waIdentity:"bsuid:123456@lid",
      waUserId:"123456@lid"})).toBe("123456@lid");
  });
});
