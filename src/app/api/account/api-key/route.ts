import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { geminiApiKey: true, geminiModel: true },
    });
    
    return NextResponse.json({ 
      apiKey: user?.geminiApiKey || '',
      modelName: user?.geminiModel || 'gemini-2.5-flash-lite'
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to fetch API key' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { apiKey, modelName } = await req.json();
    
    let workingModel = modelName;

    // Validate the API key if one is provided
    if (apiKey) {
      const genai = new GoogleGenerativeAI(apiKey);
      const modelsToTry = [
        modelName,
        'gemini-2.5-flash-lite',
        'gemini-2.5-flash-lite',
        'gemini-1.5-pro'
      ].filter(Boolean); // Ensure no empty strings

      // Deduplicate array while keeping order
      const uniqueModels = [...new Set(modelsToTry)];
      
      let isValid = false;

      for (const modelId of uniqueModels) {
        try {
          const model = genai.getGenerativeModel({ model: modelId });
          const result = await model.generateContent("Respond with exactly one word: 'ok'");
          if (result.response.text()) {
            isValid = true;
            workingModel = modelId;
            break; // Found a working model!
          }
        } catch (e) {
          // Continue to next model
          console.warn(`API Key validation failed for model ${modelId}:`, e);
        }
      }

      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid API Key or no supported model available.' }, 
          { status: 400 }
        );
      }
    }
    
    await prisma.user.update({
      where: { email: session.user.email },
      data: { 
        geminiApiKey: apiKey || null,
        geminiModel: apiKey ? workingModel : null
      },
    });

    return NextResponse.json({ success: true, modelName: workingModel });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });
  }
}
