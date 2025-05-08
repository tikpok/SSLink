import CryptoJS from "crypto-js";
let editIndex = null; // 編集対象のインデックスを保存

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("setup-form");
  if (!form) {
    console.error("setup-form が見つかりません");
    return;
  }

  document.getElementById("hasVcInfo").addEventListener("change", (e) => {
    document.getElementById("vc-fields").style.display = e.target.checked
      ? "block"
      : "none";
  });

  document
    .getElementById("setup-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const keyName = document.getElementById("keyName").value.trim();
      const privateKey = document.getElementById("privateKey").value.trim();
      const passphrase = document.getElementById("passphrase").value.trim();
      const vcJws = document.getElementById("vcJws")?.value.trim();
      const vcHash = document.getElementById("vcHash")?.value.trim();

      if (privateKey.length !== 64 || !/^[0-9a-fA-F]+$/.test(privateKey)) {
        document.getElementById("status").textContent =
          "秘密鍵の形式が不正です。";
        return;
      }

      const encrypted = CryptoJS.AES.encrypt(privateKey, passphrase).toString();
      let keys =
        (await browser.storage.local.get("symbolKeys")).symbolKeys || [];

      const newKey = {
        keyName,
        encryptedKey: encrypted,
        vcJws,
        vcHash,
      };

      if (editIndex !== null) {
        // 上書き
        keys[editIndex] = newKey;
        editIndex = null;
        document.getElementById("status").textContent =
          "編集内容を保存しました✨";
      } else {
        // 新規追加
        keys.push(newKey);
        document.getElementById("status").textContent =
          "新しい鍵を保存しました✨";
      }

      await browser.storage.local.set({ symbolKeys: keys });

      // フォームリセット
      document.getElementById("setup-form").reset();
      document.getElementById("vc-fields").style.display = "none";
      loadKeyList();
    });

  // 保存済みキーの一覧表示
  function loadKeyList() {
    const keyList = document.getElementById("keyList");
    keyList.innerHTML = "";

    browser.storage.local.get("symbolKeys").then((res) => {
      const keys = res.symbolKeys || [];
      keys.forEach((key, idx) => {
        const li = document.createElement("li");
        li.textContent = key.keyName;

        const editBtn = document.createElement("button");
        editBtn.textContent = "変更";
        editBtn.style.marginLeft = "8px";

        editBtn.onclick = async () => {
          const passphrase = prompt(
            "変更するには現在のパスフレーズを入力してください:"
          );
          const decrypted = CryptoJS.AES.decrypt(
            key.encryptedKey,
            passphrase
          ).toString(CryptoJS.enc.Utf8);
          if (!decrypted) {
            alert("パスフレーズが正しくありません！");
            return;
          }

          editIndex = idx;

          // 登録フォームに既存の値を流し込む
          document.getElementById("keyName").value = key.keyName;
          document.getElementById("privateKey").value = decrypted;
          document.getElementById("passphrase").value = passphrase;

          if (key.vcJws || key.vcHash) {
            document.getElementById("hasVcInfo").checked = true;
            document.getElementById("vc-fields").style.display = "block";
            document.getElementById("vcJws").value = key.vcJws || "";
            document.getElementById("vcHash").value = key.vcHash || "";
          } else {
            document.getElementById("hasVcInfo").checked = false;
            document.getElementById("vc-fields").style.display = "none";
            document.getElementById("vcJws").value = "";
            document.getElementById("vcHash").value = "";
          }

          document.getElementById("status").textContent =
            "編集中の状態になりました。";
        };

        li.appendChild(editBtn);
        keyList.appendChild(li);
      });
    });
  }

  function loadKeyList() {
    const keyList = document.getElementById("keyList");
    keyList.innerHTML = "";

    browser.storage.local.get("symbolKeys").then((res) => {
      const keys = res.symbolKeys || [];
      keys.forEach((key, idx) => {
        const li = document.createElement("li");
        li.textContent = key.keyName;

        // ✏️ 編集ボタン
        const editBtn = document.createElement("button");
        editBtn.textContent = "変更";
        editBtn.style.marginLeft = "8px";
        editBtn.onclick = async () => {
          const passphrase = prompt(
            "変更するには現在のパスフレーズを入力してください:"
          );
          const decrypted = CryptoJS.AES.decrypt(
            key.encryptedKey,
            passphrase
          ).toString(CryptoJS.enc.Utf8);
          if (!decrypted) {
            alert("パスフレーズが正しくありません！");
            return;
          }

          editIndex = idx;
          document.getElementById("keyName").value = key.keyName;
          document.getElementById("privateKey").value = decrypted;
          document.getElementById("passphrase").value = passphrase;

          if (key.vcJws || key.vcHash) {
            document.getElementById("hasVcInfo").checked = true;
            document.getElementById("vc-fields").style.display = "block";
            document.getElementById("vcJws").value = key.vcJws || "";
            document.getElementById("vcHash").value = key.vcHash || "";
          } else {
            document.getElementById("hasVcInfo").checked = false;
            document.getElementById("vc-fields").style.display = "none";
            document.getElementById("vcJws").value = "";
            document.getElementById("vcHash").value = "";
          }

          document.getElementById("status").textContent =
            "編集中の状態になりました。";
        };

        // 🗑️ 削除ボタン
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "削除";
        deleteBtn.style.marginLeft = "8px";
        deleteBtn.onclick = async () => {
          const passphrase = prompt(
            "削除するにはパスフレーズを入力してください:"
          );
          const decrypted = CryptoJS.AES.decrypt(
            key.encryptedKey,
            passphrase
          ).toString(CryptoJS.enc.Utf8);
          if (!decrypted) {
            alert("パスフレーズが正しくありません！");
            return;
          }

          if (confirm(`「${key.keyName}」を本当に削除しますか？`)) {
            keys.splice(idx, 1);
            await browser.storage.local.set({ symbolKeys: keys });
            loadKeyList();
          }
        };

        li.appendChild(editBtn);
        li.appendChild(deleteBtn);
        keyList.appendChild(li);
      });
    });
  }

  loadKeyList(); // 表示更新
});
