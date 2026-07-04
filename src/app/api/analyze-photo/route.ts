import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const { imageUrl, prompt } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is missing. Please set GEMINI_API_KEY in .env.local.' }, { status: 400 });
    }
    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is missing.' }, { status: 400 });
    }
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is missing.' }, { status: 400 });
    }

    // 画像URLからデータを取得してBase64に変換
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch the uploaded image for analysis');
    }
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    
    // mime typeの推定 (簡易的)
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('Gemini API Error (Analyze Photo):', error);
    return NextResponse.json({ error: error.message || 'Failed to analyze photo' }, { status: 500 });
  }
}
