import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const { message, data } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is missing. Please set GEMINI_API_KEY in .env.local.' }, { status: 400 });
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    
    // データが多すぎる場合は直近の300件程度に絞る（トークン節約のため）
    const recentData = data.slice(-300);
    
    const systemPrompt = `
あなたはパーソナルトレーナー・データアナリストAIです。
ユーザーの筋トレデータ（JSON形式）を元に、ユーザーの質問に回答したり、成長を分析したりしてください。
データは「日付」「種目」「セット数」「重量」「回数」「アップ/本番」で構成されています。

【筋トレデータ】
${JSON.stringify(recentData)}

ユーザーからの質問：
${message}
`;
    
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();
    
    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process chat' }, { status: 500 });
  }
}
