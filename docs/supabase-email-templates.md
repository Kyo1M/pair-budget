# Supabase 認証メールテンプレート

## 設定方法

1. Supabase Dashboard にアクセス
2. プロジェクトを選択
3. **Authentication** > **Email Templates** を開く
4. 各テンプレートを以下の内容に変更

## 1. Confirm Signup（新規登録確認）

### Subject（件名）
```
【ふたりの財布】メールアドレスの確認
```

### Body（本文）
```html
<h2>メールアドレスの確認</h2>

<p>ふたりの財布へようこそ！</p>

<p>アカウント登録ありがとうございます。以下のボタンをクリックして、メールアドレスの確認を完了してください。</p>

<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">メールアドレスを確認する</a></p>

<p>または、以下のURLをブラウザにコピー＆ペーストしてください：</p>
<p style="color: #6B7280; font-size: 14px; word-break: break-all;">{{ .ConfirmationURL }}</p>

<hr style="margin: 24px 0; border: none; border-top: 1px solid #E5E7EB;">

<p style="color: #6B7280; font-size: 12px;">
このメールに心当たりがない場合は、無視してください。<br>
リンクの有効期限は24時間です。
</p>

<p style="color: #6B7280; font-size: 12px;">
ふたりの財布 - 夫婦のための家計管理アプリ
</p>
```

## 2. Magic Link（マジックリンク）※将来的に使用する場合

### Subject（件名）
```
【ふたりの財布】ログインリンク
```

### Body（本文）
```html
<h2>ログインリンク</h2>

<p>以下のボタンをクリックしてログインしてください。</p>

<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">ログインする</a></p>

<p>または、以下のURLをブラウザにコピー＆ペーストしてください：</p>
<p style="color: #6B7280; font-size: 14px; word-break: break-all;">{{ .ConfirmationURL }}</p>

<hr style="margin: 24px 0; border: none; border-top: 1px solid #E5E7EB;">

<p style="color: #6B7280; font-size: 12px;">
このメールに心当たりがない場合は、無視してください。<br>
リンクの有効期限は1時間です。
</p>

<p style="color: #6B7280; font-size: 12px;">
ふたりの財布 - 夫婦のための家計管理アプリ
</p>
```

## 3. Change Email Address（メールアドレス変更）※将来的に使用する場合

### Subject（件名）
```
【ふたりの財布】メールアドレス変更の確認
```

### Body（本文）
```html
<h2>メールアドレス変更の確認</h2>

<p>メールアドレスの変更リクエストを受け付けました。</p>

<p>以下のボタンをクリックして、新しいメールアドレスを確認してください。</p>

<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">メールアドレスを確認する</a></p>

<p>または、以下のURLをブラウザにコピー＆ペーストしてください：</p>
<p style="color: #6B7280; font-size: 14px; word-break: break-all;">{{ .ConfirmationURL }}</p>

<hr style="margin: 24px 0; border: none; border-top: 1px solid #E5E7EB;">

<p style="color: #6B7280; font-size: 12px;">
このメールに心当たりがない場合は、すぐにパスワードを変更してください。<br>
リンクの有効期限は24時間です。
</p>

<p style="color: #6B7280; font-size: 12px;">
ふたりの財布 - 夫婦のための家計管理アプリ
</p>
```

## 4. Reset Password（パスワードリセット）※将来的に使用する場合

### Subject（件名）
```
【ふたりの財布】パスワードリセットのご案内
```

### Body（本文）
```html
<h2>パスワードリセット</h2>

<p>パスワードリセットのリクエストを受け付けました。</p>

<p>以下のボタンをクリックして、新しいパスワードを設定してください。</p>

<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">パスワードをリセットする</a></p>

<p>または、以下のURLをブラウザにコピー＆ペーストしてください：</p>
<p style="color: #6B7280; font-size: 14px; word-break: break-all;">{{ .ConfirmationURL }}</p>

<hr style="margin: 24px 0; border: none; border-top: 1px solid #E5E7EB;">

<p style="color: #6B7280; font-size: 12px;">
このメールに心当たりがない場合は、無視してください。<br>
リンクの有効期限は1時間です。
</p>

<p style="color: #6B7280; font-size: 12px;">
ふたりの財布 - 夫婦のための家計管理アプリ
</p>
```

## メール認証の設定

### Email Confirmation を有効にする

1. **Authentication** > **Providers** > **Email** を開く
2. **Confirm email** をONにする
3. **Enable email confirmations** にチェック

これにより、新規登録時にメール認証が必須になります。

### 開発時の注意

開発環境では、Supabase Dashboard の **Authentication** > **Users** から手動でメールアドレスを確認済みにすることができます。

### Redirect URLの設定

メール内のリンクをクリックした後のリダイレクト先を設定：

1. **Authentication** > **URL Configuration**
2. **Redirect URLs** に以下を追加：
   - `http://localhost:3000/`（開発環境）
   - `https://your-domain.com/`（本番環境）

## カスタマイズのポイント

- **ブランドカラー**: `#4F46E5` を変更してアプリのカラーに合わせる
- **フッター**: 必要に応じて会社情報やプライバシーポリシーへのリンクを追加
- **トーン**: カジュアル・フォーマルなど、アプリの雰囲気に合わせて調整

