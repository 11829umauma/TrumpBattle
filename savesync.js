// セーブをブラウザの保存領域（IndexedDB）へすぐ書き込む（2026-11-25 ユーザー「Web 版はセーブデータが残らないことが多い」）。
// love.js はページを閉じる瞬間（beforeunload）にしか書き込まないが、スマホではその合図がほとんど来ない。そこで:
//   1. ゲームがセーブしたら（game/app.lua の app.saveGame が print("@@sync@@")）すぐ書き込む
//   2. 画面が裏に回った・ページを離れるとき（visibilitychange / pagehide。スマホでも来る）にも書き込む
//   3. navigator.storage.persist() で、容量が足りないときにブラウザが勝手に消さないよう頼む
// 書き込み口 Module.syncSave は tools/web/patch_love.js が love.js に足す。書き込み中に次の合図が来たら、終わってからもう 1 回
window.saveSync = (function () {
  var PREFIX = "@@sync@@";
  var busy = false, again = false;

  function sync() {
    if (typeof Module === "undefined" || !Module.syncSave) return;
    if (busy) { again = true; return; }
    busy = true;
    try {
      Module.syncSave(function (err) {
        busy = false;
        if (err) console.error("saveSync:", err);
        if (again) { again = false; sync(); }
      });
    } catch (e) {
      busy = false;
      console.error("saveSync:", e);
    }
  }

  function handle(text) {
    if (typeof text !== "string" || text.indexOf(PREFIX) < 0) return false;
    sync();
    return true;
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") sync();
  });
  window.addEventListener("pagehide", sync);

  try {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then(function (ok) { console.log("saveSync: persist " + ok); });
    }
  } catch (e) {}

  return { handle: handle, sync: sync };
})();
