import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const { imageUrls, prompt } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is missing.' }, { status: 400 });
    }
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: 'Image URLs are missing.' }, { status: 400 });
    }
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is missing.' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    
    // 全ての画像をダウンロードしてBase64に変換
    const imageParts = await Promise.all(
      imageUrls.map(async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${url}`);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = response.headers.get('content-type') || 'image/jpeg';
        
        return {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: mimeType
          }
        };
      })
    );

    // プロンプトと複数の画像を一緒にGeminiに渡す
    // Geminiは時系列順に渡された複数画像を認識して比較分析が可能
    const contents = [
      "以下の写真は時系列順に並んでいます。これらを比較して次の指示に従ってください：\n\n" + prompt,
      ...imageParts
    ];

    const result = await model.generateContent(contents);
    const response = await result.response;
    const text = response.text();
    
    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('Gemini API Error (Analyze Growth):', error);
    return NextResponse.json({ error: error.message || 'Failed to analyze growth' }, { status: 500 });
  }
}
