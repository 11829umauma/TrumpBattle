// ブラウザ版の文字の入力（2026-11-25、名前を決める画面 game/scenes/name.lua）。canvas ではスマホのキーボードが出ないので、ブラウザの入力欄を使う
//   Lua → JS: print("@@prompt@@" + JSON { id, title, value }) → index.html の Module.print がここの handle に渡す
//   JS → Lua: 入れた文字を、メモリ上のファイル /prompt_res_<id>.txt に書く（取り消しなら "\0cancel"）。Lua が読んで消す
window.textPrompt = (function () {
  var PREFIX = "@@prompt@@";
  function handle(text) {
    var at = typeof text === "string" ? text.indexOf(PREFIX) : -1;
    if (at < 0) return false;
    var o;
    try { o = JSON.parse(text.slice(at + PREFIX.length)); } catch (e) { return true; }
    setTimeout(function () {
      var v = window.prompt(o.title || "", o.value || "");
      var bytes = new TextEncoder().encode(v === null ? "\u0000cancel" : v);
      var name = "prompt_res_" + o.id + ".txt";
      try { Module.FS_unlink("/" + name); } catch (e) {}
      Module.FS_createDataFile("/", name, bytes, true, true, true);
    }, 30);
    return true;
  }
  return { handle: handle };
})();
