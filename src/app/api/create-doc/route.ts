import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) {
      return NextResponse.json({ error: 'Google Cloud Credentials not configured' }, { status: 500 });
    }

    // Google Drive APIの初期化 (書き込み権限を含む)
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive']
    });

    const drive = google.drive({ version: 'v3', auth });

    // 1. 今日の日付のタイトルを生成
    const now = new Date();
    // UTCからJSTへ変換 (日本時間)
    now.setHours(now.getHours() + 9);
    const todayTitle = `筋トレ${now.getFullYear()}_${now.getMonth() + 1}_${now.getDate()}`;

    // 2. すでに今日のドキュメントが存在するか確認
    const existingRes = await drive.files.list({
      q: `name = '${todayTitle}' and mimeType='application/vnd.google-apps.document' and trashed=false`,
      fields: 'files(id, webViewLink)'
    });

    if (existingRes.data.files && existingRes.data.files.length > 0) {
      const file = existingRes.data.files[0];
      const url = file.webViewLink || `https://docs.google.com/document/d/${file.id}/edit`;
      // 既に存在する場合はそのリンクを返す
      return NextResponse.json({ 
        success: true, 
        url: url,
        message: '既存のドキュメントを開きます'
      });
    }

    // 3. 保存先のフォルダ（筋トレディレクトリ）を探す
    // ※アプリの鍵に共有されているフォルダの中で、名前に「筋トレ」が含まれるものを探す。
    // もし複数あれば最新のもの、なければ共有されている任意のフォルダ。
    const folderRes = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id, name)',
      orderBy: 'createdTime desc'
    });

    const folders = folderRes.data.files || [];
    let targetFolderId = null;

    if (folders.length > 0) {
      // 「筋トレ」という名前が含まれるフォルダを優先、なければ最初のフォルダ
      const kintoreFolder = folders.find(f => f.name?.includes('筋トレ'));
      targetFolderId = kintoreFolder ? kintoreFolder.id : folders[0].id;
    }

    // 4. 新しいドキュメントを作成
    const fileMetadata: any = {
      name: todayTitle,
      mimeType: 'application/vnd.google-apps.document'
    };
    if (targetFolderId) {
      fileMetadata.parents = [targetFolderId];
    }

    const doc = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, webViewLink'
    });

    const url = doc.data.webViewLink || `https://docs.google.com/document/d/${doc.data.id}/edit`;

    return NextResponse.json({ 
      success: true, 
      url: url,
      message: '新しいドキュメントを作成しました'
    });

  } catch (error: any) {
    console.error('Create Doc Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
