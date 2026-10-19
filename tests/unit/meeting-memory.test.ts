import { describe, it, expect } from "vitest";
import { classifyLocally, memoryAnalysisSchema } from "../../src/server/meeting-memory/analysis";
import { recordingFormat } from "../../src/server/meeting-memory/storage";

describe("Memória NOVAGENTE", () => {
  it("classifica uma proposta sem inventar decisões", () => {
    const result = classifyLocally("Precisamos conversar sobre proposta e orçamento.");
    expect(result.category).toBe("venda");
    expect(result.suggestedTasks).toEqual([]);
    expect(result.method).toBe("local_rules");
    expect(memoryAnalysisSchema.safeParse(result).success).toBe(true);
  });
  it("valida assinatura WebM", () => {
    expect(recordingFormat("audio/webm", new Uint8Array([26,69,223,163]))).toBe("webm");
    expect(recordingFormat("audio/webm", new Uint8Array([1,2,3,4]))).toBeNull();
  });
  it("não aceita arquivos não identificados", () => {
    expect(recordingFormat("audio/mpeg", new Uint8Array([1,2,3,4]))).toBeNull();
  });
});
