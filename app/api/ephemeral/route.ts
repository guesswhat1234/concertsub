import { NextRequest } from 'next/server';

export const runtime = 'nodejs'; // ensure Node.js runtime on Vercel

// Create an ephemeral Realtime session token for the browser to use with WebRTC.
// Never expose your real API key to the client.
export async function GET(_req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY' }), { status: 500 });
  }

  // See OpenAI Realtime docs for the latest URL and payload shape.
  const resp = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-realtime-preview',
      // Instruct the session to act as a KO->ZH-TW subtitle engine.
      // The model will continuously transcribe and immediately translate to Traditional Chinese.
      // We keep responses short, subtitle-style.
      instructions: 'You are a low-latency subtitle engine at a concert. Transcribe spoken Korean and immediately output only the Traditional Chinese translation (zh-TW). Keep each line concise, natural, and suitable as live captions. No extra commentary.',
      modalities: ['text', 'audio'],
      audio: { voice: 'alloy', format: 'pcm16' }
    })
  });

  if (!resp.ok) {
    const text = await resp.text();
    return new Response(JSON.stringify({ error: 'Failed to create ephemeral session', details: text }), { status: 500 });
  }
  const data = await resp.json();
  // Pass the client_secret to the browser; it expires quickly.
  return Response.json({ client_secret: data.client_secret });
}
