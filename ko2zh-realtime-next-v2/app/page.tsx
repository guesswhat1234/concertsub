'use client';

import './globals.css';
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('ready');
  const [curr, setCurr] = useState('');
  const [prev1, setPrev1] = useState('');
  const [prev2, setPrev2] = useState('');

  useEffect(() => {
    return () => { stop(); };
  }, []);

  async function start() {
    try {
      setStatus('preparing');

      // 1) Ask our server for an ephemeral client_secret
      const tokenResp = await fetch('/api/ephemeral');
      const { client_secret, error } = await tokenResp.json();
      if (error) throw new Error(error);

      // 2) Prepare mic
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          noiseSuppression: true,
          echoCancellation: false,
          autoGainControl: false,
        }
      });

      // 3) Create a WebRTC connection to OpenAI Realtime
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Optional: play back model audio (not needed for subtitles, but keeps WebRTC happy)
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; };

      // Send our mic
      for (const track of stream.getTracks()) pc.addTrack(track, stream);

      // Data channel for receiving events
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;
      dc.onmessage = (ev) => handleOAIEvent(ev.data);
      dc.onopen = () => setStatus('connected');

      // 4) Start SDP offer/answer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = 'https://api.openai.com/v1/realtime';
      const url = `${baseUrl}?model=gpt-4o-realtime-preview`;

      const token = (client_secret?.value || client_secret?.secret || client_secret);
      const sdpResp = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/sdp',
          'OpenAI-Beta': 'realtime=v1'
        },
        body: offer.sdp
      });

      if (!sdpResp.ok) {
        const text = await sdpResp.text();
        throw new Error('OpenAI SDP failed: ' + text);
      }

      const answer = { type: 'answer', sdp: await sdpResp.text() } as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(answer);

      setRunning(true);
      setStatus('listening');
      setCurr('');
    } catch (e:any) {
      console.error(e);
      alert('啟動失敗：' + e.message);
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
    setStatus('ready');
  }

  function handleOAIEvent(data: any) {
    // Realtime API uses JSON lines. Some browsers may deliver as string.
    let obj: any;
    try {
      obj = typeof data === 'string' ? JSON.parse(data) : data;
    } catch {
      // Sometimes messages come as a stream of JSONL separated by \n
      const lines = String(data).trim().split('\n');
      for (const line of lines) {
        try { const o = JSON.parse(line); handleParsedEvent(o); } catch {}
      }
      return;
    }
    handleParsedEvent(obj);
  }

  function handleParsedEvent(ev: any) {
    // Look for incremental text deltas and final completions
    // Common event types: 'response.output_text.delta', 'response.completed'
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
      // Clear interim when a new utterance starts
      setCurr('');
    }
  }

  return (
    <main className="container">
      <h1>韓→中 即時字幕（OpenAI Realtime / WebRTC）</h1>
      <div className="controls">
        <button id="start" onClick={start} disabled={running}>開始</button>
        <button id="stop" onClick={stop} disabled={!running}>停止</button>
        <small className="hint">建議連接指向性麥克風或音控台 Line-out。狀態：{status}</small>
      </div>
      <div className="subs">
        <div className="line">{curr && <><span className="badge">即時</span>{curr}</>}</div>
        <div className="line secondary">{prev1}</div>
        <div className="line secondary">{prev2}</div>
      </div>
    </main>
  );
}
