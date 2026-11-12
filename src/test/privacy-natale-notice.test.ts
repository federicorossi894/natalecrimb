import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const privacy = readFileSync(resolve(process.cwd(), "src/routes/privacy.tsx"), "utf8");
const shell = readFileSync(resolve(process.cwd(), "src/components/xmas/Shell.tsx"), "utf8");
const gift = readFileSync(resolve(process.cwd(), "src/components/xmas/OnlineGiftFlow.tsx"), "utf8");
const mail = readFileSync(resolve(process.cwd(), "src/lib/gift-mail.server.ts"), "utf8");

describe("Natale privacy transparency", () => {
  it("publishes a plain-language campaign notice rather than an unapproved generic draft", () => {
    expect(privacy).toContain("Informativa sulla privacy");
    expect(privacy).toContain("Croce Rossa Italiana – Comitato di Monza ODV");
    expect(privacy).toContain("monza@cri.it");
    expect(privacy).toContain("Regolamento (UE) 2016/679");
    expect(privacy).not.toContain("Bozza in revisione");
    expect(privacy).not.toContain("Da definire con il Comitato");
  });
  it("never falsely promises that the database, email or accounting records do not exist", () => {
    expect(privacy).toContain("database operativo");
    expect(privacy).toContain("Le email già inviate possono invece rimanere");
    expect(privacy).toContain("Le registrazioni contabili e dei pagamenti");
    expect(privacy).toContain("Chiudere una pagina web, da solo, non cancella il database");
  });
  it("explains the separate public-consent choice and local storage", () => {
    expect(privacy).toContain("soltanto se hai selezionato la pubblicazione");
    expect(privacy).toContain("conservare identificativi tecnici");
    expect(privacy).toContain("Accademia dei Piccoli Volontari");
  });
  it("updates footer, checkout and email privacy links without changing their destinations", () => {
    expect(shell).toContain('to="/privacy"');
    expect(shell).toContain("Informativa privacy");
    expect(gift).toContain('to="/privacy"');
    expect(gift).toContain("Leggi l’informativa sulla privacy");
    expect(mail).toContain('/privacy"');
    expect(mail).toContain("Informativa sulla privacy");
    expect(shell).not.toContain("bozza in revisione");
    expect(mail).not.toContain("bozza in revisione");
  });
});
