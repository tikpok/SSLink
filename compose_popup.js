globalThis.WebAssembly = undefined;

import CryptoJS from "crypto-js";
import { SymbolFacade ,KeyPair,SymbolAccount} from "symbol-sdk/symbol";
import { PrivateKey} from "symbol-sdk";

document.addEventListener("DOMContentLoaded", async () => {
  const keySelect = document.getElementById("keySelect");
  const passInput = document.getElementById("passphrase");
  const signButton = document.getElementById("signButton");

  const { symbolKeys = [] } = await browser.storage.local.get("symbolKeys");

  // 鍵リストをセレクトに追加
  symbolKeys.forEach((key, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = key.keyName;
    keySelect.appendChild(option);
  });

  signButton.addEventListener("click", async () => {
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const details = await browser.compose.getComposeDetails(tab.id);
      const body = details.plainTextBody || details.body;

      const selectedIndex = parseInt(keySelect.value, 10);
      const encrypted = symbolKeys[selectedIndex].encryptedKey;
      const passphrase = passInput.value;

      const decryptedKey = CryptoJS.AES.decrypt(encrypted, passphrase).toString(
        CryptoJS.enc.Utf8
      );
      if (!decryptedKey) {
        alert("パスフレーズが正しくありません。");
        return;
      }
      console.log(decryptedKey);
      const facade = new SymbolFacade('testnet');
      const alice = facade.createAccount(
        new PrivateKey(decryptedKey)
      );
      console.log("alice",alice);
      const prikey = new PrivateKey(decryptedKey);
      console.log(prikey);
      const privatekey = new KeyPair(prikey);
      console.log(privatekey);
      const alice1 = new SymbolAccount(facade,privatekey);

      console.log("alice", alice1);
      const alice_PubKey = alice.publicKey;

      const Buffer = require("/node_modules/buffer").Buffer;
      const payload = Buffer.from(body, "utf-8");
      console.log("Raw body:", JSON.stringify(body));
      console.log(payload);
      
      const signature = alice.keyPair.sign(payload);
      console.log(signature);

      console.log(symbolKeys);
      console.log(alice_PubKey);

      const customHeaders = [
        {
          name: "X-Symbol-Public-Key",
          value: alice_PubKey.toString(),
        },
        {
          name: "X-Symbol-Signature",
          value: signature.toString(),
        },
      ];
      if (symbolKeys[selectedIndex].vcJws && symbolKeys[selectedIndex].vcHash) {
        customHeaders.push({
          name: "X-Symbol-VC-JWS",
          value: symbolKeys[selectedIndex].vcJws,
        });
        customHeaders.push({
          name: "X-Symbol-VC-Hash",
          value:symbolKeys[selectedIndex].vcHash,
        });
      }
      await browser.compose.setComposeDetails(tab.id, {
        customHeaders,
      });

      alert("署名を追加しました！");
    } catch (err) {
      console.error("エラー:", err);
      alert("エラーが発生しました。");
    }
  });
});
