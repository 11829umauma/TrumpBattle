// 通信対戦（インターネット越し）のブラウザ側。ゲーム側の窓口は game/net.lua（net.relayHost / relayJoin）
// love.js にはソケットが無いので、中継サーバー（server/relay.js）への WebSocket をここで持つ
//   Lua → JS: print("@@net@@" + JSON) → index.html の Module.print がここの handle に渡す
//             { op: "open", url } / { op: "send", line } / { op: "close" }
//   JS → Lua: 届いた 1 つずつを、メモリ上のファイル /net_in_<番号>.txt（1 から順）に書く。Lua が順に読んで消す
//             つながった・切れたは {"t":"_ws","ev":"open" / "close"} として同じ並びに入れる
window.netBridge = (function () {
  var PREFIX = "@@net@@";
  var ws = null;
  var seq = 1;

  function deliver(line) {
    var name = "net_in_" + seq + ".txt";
    seq += 1;
    var bytes = new TextEncoder().encode(line);
    try { Module.FS_unlink("/" + name); } catch (e) {}
    Module.FS_createDataFile("/", name, bytes, true, true, true);
  }

  function clearFiles() {
    for (var i = 1; i < seq + 50; i++) {
      try { Module.FS_unlink("/net_in_" + i + ".txt"); } catch (e) {}
    }
    seq = 1;
  }

  function close() {
    if (ws) {
      var old = ws;
      ws = null;
      try { old.close(); } catch (e) {}
    }
  }

  function open(url) {
    close();
    clearFiles();
    var me;
    try {
      me = new WebSocket(url);
    } catch (e) {
      deliver('{"t":"_ws","ev":"close"}');
      return;
    }
    ws = me;
    me.onopen = function () { if (ws === me) deliver('{"t":"_ws","ev":"open"}'); };
    me.onmessage = function (e) { if (ws === me && typeof e.data === "string") deliver(e.data); };
    me.onclose = function () {
      if (ws === me) {
        ws = null;
        deliver('{"t":"_ws","ev":"close"}');
      }
    };
    me.onerror = function () { /* onclose が続けて来る */ };
  }

  function handle(text) {
    var at = typeof text === "string" ? text.indexOf(PREFIX) : -1;
    if (at < 0) return false;
    var cmd;
    try { cmd = JSON.parse(text.slice(at + PREFIX.length)); } catch (e) { console.error("net: bad command", text); return true; }
    if (cmd.op === "open") open(cmd.url);
    else if (cmd.op === "send") { if (ws && ws.readyState === 1) ws.send(cmd.line); }
    else if (cmd.op === "close") close();
    return true;
  }

  return { handle: handle };
})();
