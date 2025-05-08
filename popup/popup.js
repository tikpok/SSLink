const { PublicKey, Signature} = require("symbol-sdk");
import { SymbolFacade, Verifier } from "symbol-sdk/symbol";
import { sha256 } from "js-sha256";
const facade = new SymbolFacade("testnet");

async function appendStatus(message) {
  const log = document.getElementById("status-log");
  log.textContent += `\n${message}`;
  log.scrollTop = log.scrollHeight;
}

document
  .getElementById("verifyButton")
  .addEventListener("click", async function handleVerifyClick() {
    const button = this;
    button.disabled = true;
    button.textContent = "検証中...";

    try {
      const defaultTags = [
        { key: "verified", tag: "検証済み ✅", color: "#00cc66" },
        { key: "vc_verified", tag: "VC検証済み ✅", color: "#3399ff" },
        { key: "unverified", tag: "検証失敗 ❌", color: "#cc0000" },
        { key: "not_applicable", tag: "検証対象外 🚫", color: "#CCCCCC" },
      ];
      for (const t of defaultTags) {
        const existing = (await browser.messages.tags.list()).find(
          (tag) => tag.key === t.key
        );
        if (!existing) {
          await browser.messages.tags.create(t.key, t.tag, t.color);
        }
      }

      const tags = await browser.messages.tags.list();
      const result = await browser.messages.query({ read: false });
      const targetMessages = result.messages || [];

      for (const msg of targetMessages) {
        const messageId = msg.id;
        const subject = msg.subject || "(no subject)";
        const file = await browser.messages.getRaw(messageId);
        const rawText = await file.text();

        const signatureMatch = rawText.match(/^X-Symbol-Signature:\s*(.+)$/m);
        const publicKeyMatch = rawText.match(/^X-Symbol-Public-Key:\s*(.+)$/m);
        const vcJWSMatch = rawText.match(/^X-Symbol-Vc-Jws:\s*(.+)$/m);

        const signature = signatureMatch?.[1]?.trim() || null;
        const publicKey = publicKeyMatch?.[1]?.trim() || null;
        const vcJWS = vcJWSMatch?.[1]?.trim() || null;

        if (!signature || !publicKey) {
          const notApplicableTag = tags.find(
            (tag) => tag.key === "not_applicable"
          );
          await browser.messages.update(messageId, {
            tags: [notApplicableTag.key],
          });
          await appendStatus(`🟡 [対象外] ${subject}`);
          continue;
        }

        async function getPlainTextBody(messageId) {
          const full = await browser.messages.getFull(messageId);
          function findTextPart(part) {
            if (part.parts?.length) {
              for (const subPart of part.parts) {
                const result = findTextPart(subPart);
                if (result) return result;
              }
            } else if (part.contentType === "text/plain") {
              return part;
            }
            return null;
          }
          const textPart = findTextPart(full);
          return textPart.body;
        }

        const body = await getPlainTextBody(messageId);
        const cleanedBody = body.replace(/\r\n?/g, "\n").replace(/\n+$/, "");

        
        const pubkey = new PublicKey(publicKey);
        const sig = new Signature(signature);
        const bodyBytes = new TextEncoder().encode(cleanedBody);
        console.log("Raw body:", JSON.stringify(body));
        console.log("Raw cleanBody:", JSON.stringify(cleanedBody));
        const verifier = new Verifier(pubkey);
        const isVerified = verifier.verify(bodyBytes, sig);

        let vcVerified = false;
        console.log(vcJWS);
        if (isVerified && vcJWS) {
          try {
            const [encodedHeader, encodedPayload, encodedSig] =
              vcJWS.split(".");

            const signature = base64UrlToUint8Array(encodedSig);
            const Sig = new Signature(signature);
            const signedData = new TextEncoder().encode(
              `${encodedHeader}.${encodedPayload}`
            );
            const hash = Uint8Array.from(sha256.array(signedData));
            
            const portalPublicKey = new PublicKey(
              "6C474435AA64CF609CCA5E54B34E5EEE3BBB1F62214282E29B333D4E819504D7"
            );
            const v = new Verifier(portalPublicKey);
            const valid = v.verify(hash, Sig);
            

            // ペイロードを復元
            const payloadJson = new TextDecoder().decode(
              base64UrlToUint8Array(encodedPayload)
            );
            const vc = JSON.parse(payloadJson);
            console.log("vc", vc);
            const decoded = JSON.parse(atob(vcJWS.split(".")[1]));
            console.log("decoded", decoded);
if (!valid) {
              console.warn("❌ JWS署名が無効！");
              return;
            }

            const vcId = decoded.credentialSubject?.id || "";
            const vcEmail = decoded.credentialSubject?.email || "";

            const derivedAddress = facade.createPublicAccount(
              new PublicKey(publicKey)
            ).address.toString();
            const senderEmail = msg.author.replace(/^.*<|>$/g, "");
            console.log(vcId);
            console.log(vcEmail);
            console.log(derivedAddress);
            console.log(senderEmail);
            if (vcId === "symbolAddress:"+derivedAddress && vcEmail === senderEmail) {
              vcVerified = true;
            }
          } catch (e) {
            console.warn("VCパース失敗", e);
          }
        }
       console.log("vc",vcVerified);
       if (isVerified) {
        if (vcVerified) {
          // VCまで検証OK → VC検証済み ✅
          const vcVerifiedTag = tags.find((tag) => tag.key === "vc_verified");
          await browser.messages.update(msg.id, { tags: [vcVerifiedTag.key] });
          await appendStatus(`🟢 [VC検証済み ✅] ${subject}`);
        } else {
          // 通常の署名検証のみOK
          const verifiedTag = tags.find((tag) => tag.key === "verified");
          await browser.messages.update(msg.id, { tags: [verifiedTag.key] });
          await appendStatus(`✅ [署名検証OK！] ${subject}`);
        }
      } else {
        const unverifiedTag = tags.find((tag) => tag.key === "unverified");
        await browser.messages.update(msg.id, { tags: [unverifiedTag.key] });
        await appendStatus(`❌ [署名が一致しません。] ${subject}`);
      }
      
      }
    } catch (error) {
      console.error("エラー:", error);
      document.getElementById("status").textContent =
        "検証中にエラーが発生しました。";
    }

    await appendStatus(`🎉 検証が完了しました！`);
    button.textContent = "閉じる";
    button.disabled = false;
    button.removeEventListener("click", handleVerifyClick);
    button.addEventListener("click", () => window.close());
  });
function base64UrlToUint8Array(base64url) {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad =
    base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
