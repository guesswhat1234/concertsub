'use client';

import './globals.css';
import { useEffect, useRef, useState } from 'react';

type ClientSecret = { value?: string; secret?: string } | string;

export default function Home() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('ready');
  const [curr, setCurr] = useState('');
  const [prev1, setPrev1] = useState('');
  const [prev2, setPrev2] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => () => stop(), []);

  async function start() {
    try {
      setErr('');
      setStatus('preparing');

      // 1) Ephemeral token
      const tokenResp = await fetch('/api/ephemeral');
      const { client_secret, error, details } = await tokenResp.json();
      if (!tokenResp.ok || error) throw new Error(error || details || 'ephemeral failed');
      const token = (typeof client_secret === 'string')
        ? client_secret
        : ((client_secret as any).value || (client_secret as any).secret);

      if (!token) throw new Error('No client_secret received');

      // 2) Mic
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, noiseSuppression: true, echoCancellation: false, autoGainControl: false }
      });

      // 3) WebRTC to OpenAI
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; };

      for (const track of stream.getTracks()) pc.addTrack(track, stream);

      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;
      dc.onmessage = (ev) => handleOAIEvent(ev.data);
      dc.onopen = () => setStatus('connected');

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const url = `https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview`;
      const sdpResp = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/sdp',
          'OpenAI-Beta': 'realtime=v1',
        },
        body: offer.sdp as any
      });

      if (!sdpResp.ok) {
        const text = await sdpResp.text();
        throw new Error('SDP failed: ' + text);
      }

      const answer = { type: 'answer', sdp: await sdpResp.text() } as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(answer);

      setRunning(true);
      setStatus('listening');
      setCurr('');
    } catch (e:any) {
      console.error(e);
      setErr(e?.message || String(e));
      setStatus('ready');
      stop();
    }
  }

  function stop() {
    try { pcRef.current?.getSenders().forEach(s => s.track?.stop()); } catch {}
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    try { dcRef.current?.close(); } catch {}
    dcRef.current = null;
    setRunning(false);
  }

  function handleOAIEvent(data: any) {
    // JSONL stream
    const raw = String(data).trim().split('\n');
    for (const line of raw) {
      try {
        const ev = JSON.parse(line);
        const t = ev.type;
        if (t === 'response.output_text.delta') {
          const piece = ev.delta || ev.output_text_delta || ev.text || '';
          if (piece) setCurr(prev => prev + piece);
        } else if (t === 'response.completed' || t === 'response.output_text.done' || t === 'response.done') {
          if (curr.trim()) {
            setPrev2(prev1);
            setPrev1(curr);
            setCurr('');
          }
        } else if (t === 'input_audio_buffer.speech_started') {
          setCurr('');
        }
      } catch {}
    }
  }

  return (
    <main className="container">
      <h1>韓→中 即時字幕（OpenAI Realtime / WebRTC）</h1>
      <div className="controls">
        <button id="start" onClick={start} disabled={running}>開始</button>
        <button id="stop" onClick={stop} disabled={!running}>停止</button>
        <small className="hint">狀態：{status}</small>
      </div>
      {err && <div className="error">錯誤：{err}</div>}
      <div className="subs">
        <div className="line">{curr && <><span className="badge">即時</span>{curr}</>}</div>
        <div className="line secondary">{prev1}</div>
        <div className="line secondary">{prev2}</div>
      </div>
    </main>
  );
}
