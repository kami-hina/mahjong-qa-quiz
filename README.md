# 麻雀質問クイズ

LINE のトークルーム「麻雀質問用」で、かみむらひなが送った牌譜画像＋質問と、
磯部さんの回答（何を切るべきか・解説）を取り込み、回答をマスクして出題するスマホ向け Web アプリ。
「何切るクイズ」（C:\麻雀）とは別アプリ。

- クイズ画面には質問者の画像と質問文を表示し、磯部さんの回答は「タップして答えを見る」までマスク
- 自己採点（覚えてた／覚えてなかった）を端末の localStorage に蓄積し、「未出題だけ」「要復習だけ」などで出題
- 一覧タブから日付ごとに全問を閲覧できる（回答がまだない質問も表示）
- 静的ファイルのみ。GitHub Pages 等で動作

## 構成

| パス | 内容 |
| --- | --- |
| `index.html` | アプリ本体 |
| `data/questions.json` | 質問・画像・回答の組（`tools/build.py` が生成） |
| `images/` | LINE から保存した画像（ファイル名は LINE のメッセージ ID） |
| `tools/` | LINE からの取得スクリプト（下記） |

## LINE からの取り込み手順（読み取りのみ。LINE には一切書き込まない）

LINE の Chrome 拡張（公式 ID `ophjlpahpchlmihnnnihgmmeilfjmjjc`）を Playwright の Chromium に読み込んで操作する。
拡張は `tools/line-ext/` に展開して置く（git には含めない）。展開時は manifest.json に CRX の公開鍵 `key` を追加して
拡張 IDが公式と同じになるようにする（サンドボックスが公式 ID 以外を拒否するため）。

```powershell
cd tools
node line-browser.js      # 拡張入り Chromium を起動（CDP ポート 9333）。初回は画面で LINE にログイン
node open.js; node open2.js   # 「麻雀質問用」を検索して開く
node scroll3.js           # 最上部まで遡って全履歴を読み込む
node extract.js           # メッセージを raw.json に書き出す
node saveimgs.js          # 画像を images/ に保存（既存はスキップ）
python -I pair.py         # 質問・画像・回答を紐付けて paired.json / report.txt を作る
python -I build.py        # data/questions.json を生成
```

紐付けルール（`pair.py`）:

- ひなのテキスト＝質問。直前に送られた画像（または同時刻の画像）をその質問の画像にする
- 画像なしの質問は直前の質問の画像を引き継ぐ（10 分以内）。回答がない追記は前の質問に補足として結合
- 磯部さんの「返信」の引用文と質問文を照合して回答を紐付ける。画像への返信は直前の未回答質問に推定で紐付け（アプリ上に「紐付けは推定」と表示）
- 磯部さんの返信でない発言は直前の回答への補足として扱う

ログイン情報は `tools/profile/`（git 管理外）に保存されるので、2 回目以降はログイン不要。
