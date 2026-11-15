"use client";

import type { DrawingUtils, GestureRecognizer, GestureRecognizerResult } from "@mediapipe/tasks-vision";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

// Must match @mediapipe/tasks-vision in package.json, otherwise the JS API and the WASM binary can disagree.
const MEDIAPIPE_VERSION = "1.2.3";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
// Pinned model version (not `latest`) so detection doesn't change underneath us.
const MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";

/** Lower resolution keeps inference fast on cheap school phones; hands are still detected reliably. */
const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
    audio: false,
    video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
};

const MIN_SCORE = 0.6;
/** A gesture must be held this long before it becomes a phrase, so passing hand shapes are ignored. */
const HOLD_MS = 800;
/** The hand must be lowered (or change gesture) this long before the same phrase can repeat. */
const RELEASE_MS = 400;
const STATS_INTERVAL_MS = 250;
const MAX_PHRASES = 20;

/**
 * Temporary mapping from MediaPipe's built-in gestures to classroom phrases (PRD F-05).
 * These are NOT SIBI/BISINDO signs; real signs need a custom-trained classifier.
 */
const GESTURE_PHRASES: Record<string, string> = {
    Open_Palm: "Hadir",
    Thumb_Up: "Mengerti",
    Thumb_Down: "Belum mengerti",
    Pointing_Up: "Izin bertanya",
    Closed_Fist: "Butuh bantuan",
};

const GESTURE_LABELS: Record<string, string> = {
    None: "Tidak dikenali",
    Open_Palm: "Telapak terbuka",
    Thumb_Up: "Jempol ke atas",
    Thumb_Down: "Jempol ke bawah",
    Pointing_Up: "Telunjuk ke atas",
    Closed_Fist: "Kepalan tangan",
    Victory: "Tanda V",
    ILoveYou: "I Love You (ASL)",
};

type Delegate = "GPU" | "CPU";
type Status =
    | { kind: "idle" }
    | { kind: "loading"; step: string }
    | { kind: "running" }
    | { kind: "error"; message: string };
type HandInfo = { handedness: string; gesture: string; score: number };
type Stats = {
    fps: number;
    inferenceMs: number;
    delegate: Delegate;
    hands: HandInfo[];
    candidate: string | null;
    holdProgress: number;
};

/** Everything owned by one camera session. Mutated inside the frame loop without re-rendering React. */
type Session = {
    stream: MediaStream | null;
    recognizer: GestureRecognizer | null;
    rafId: number;
    lastVideoTime: number;
    frames: number;
    inferenceTotal: number;
    windowStart: number;
    candidate: string | null;
    candidateSince: number;
    confirmed: string | null;
};

function releaseSession(session: Session) {
    cancelAnimationFrame(session.rafId);
    for (const track of session.stream?.getTracks() ?? []) track.stop();
    session.stream = null;
    session.recognizer?.close();
    session.recognizer = null;
}

function describeError(error: unknown) {
    const name = error instanceof DOMException ? error.name : "";
    if (name === "NotAllowedError" || name === "SecurityError") {
        return "Izin kamera ditolak. Izinkan akses kamera di pengaturan browser, lalu coba lagi.";
    }
    if (name === "NotFoundError" || name === "OverconstrainedError") return "Kamera tidak ditemukan di perangkat ini.";
    if (name === "NotReadableError") return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu, lalu coba lagi.";
    return "MediaPipe gagal dimuat. Periksa koneksi internet, lalu coba lagi.";
}

function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("id"));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
}

/** Highest-scoring gesture across all detected hands. */
function topGesture(result: GestureRecognizerResult) {
    let best: { name: string; score: number } | null = null;
    for (const [top] of result.gestures) {
        if (top && (!best || top.score > best.score)) best = { name: top.categoryName, score: top.score };
    }
    return best;
}

export function SignLab() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sessionRef = useRef<Session | null>(null);
    const autoSpeakRef = useRef(true);

    const [status, setStatus] = useState<Status>({ kind: "idle" });
    const [stats, setStats] = useState<Stats | null>(null);
    const [aspectRatio, setAspectRatio] = useState(4 / 3);
    const [phrases, setPhrases] = useState<string[]>([]);
    const [autoSpeak, setAutoSpeak] = useState(true);
    const [saving, setSaving] = useState(false);

    const stop = useCallback(() => {
        if (sessionRef.current) releaseSession(sessionRef.current);
        sessionRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        const canvas = canvasRef.current;
        canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
        setStats(null);
        setStatus({ kind: "idle" });
    }, []);

    // Release the camera and the WASM model when leaving the page.
    useEffect(
        () => () => {
            if (sessionRef.current) releaseSession(sessionRef.current);
            sessionRef.current = null;
            if ("speechSynthesis" in window) window.speechSynthesis.cancel();
        },
        [],
    );

    const confirmPhrase = useCallback((phrase: string) => {
        setPhrases((prev) => [...prev, phrase].slice(-MAX_PHRASES));
        if (autoSpeakRef.current) speak(phrase);
    }, []);

    const start = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!video || !canvas || !ctx) return;

        if (!window.isSecureContext) {
            setStatus({
                kind: "error",
                message: "Kamera hanya bisa dipakai lewat HTTPS atau localhost. Buka halaman ini dari alamat HTTPS.",
            });
            return;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
            setStatus({ kind: "error", message: "Browser ini tidak mendukung akses kamera." });
            return;
        }

        const session: Session = {
            stream: null,
            recognizer: null,
            rafId: 0,
            lastVideoTime: -1,
            frames: 0,
            inferenceTotal: 0,
            windowStart: performance.now(),
            candidate: null,
            candidateSince: 0,
            confirmed: null,
        };
        sessionRef.current = session;
        // True once the user pressed "Matikan" or left the page while we were still awaiting.
        const isStale = () => sessionRef.current !== session;

        try {
            setStatus({ kind: "loading", step: "Meminta izin kamera…" });
            session.stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
            if (isStale()) return releaseSession(session);
            video.srcObject = session.stream;
            await video.play();
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            setAspectRatio(video.videoWidth / video.videoHeight);

            // Loaded on demand so the ~150 KB library isn't part of every page load.
            setStatus({ kind: "loading", step: "Mengunduh model MediaPipe (±12 MB, hanya pertama kali)…" });
            const vision = await import("@mediapipe/tasks-vision");
            const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL);
            if (isStale()) return releaseSession(session);

            const create = (delegate: Delegate) =>
                vision.GestureRecognizer.createFromOptions(fileset, {
                    baseOptions: { modelAssetPath: MODEL_URL, delegate },
                    runningMode: "VIDEO",
                    numHands: 2,
                });
            let delegate: Delegate = "GPU";
            try {
                session.recognizer = await create("GPU");
            } catch (error) {
                console.warn("[mediapipe] GPU delegate unavailable, falling back to CPU", error);
                delegate = "CPU";
                session.recognizer = await create("CPU");
            }
            if (isStale()) return releaseSession(session);

            const drawer: DrawingUtils = new vision.DrawingUtils(ctx);
            const connections = vision.GestureRecognizer.HAND_CONNECTIONS;
            let hands: HandInfo[] = [];

            const tick = () => {
                const recognizer = session.recognizer;
                if (isStale() || !recognizer) return;
                try {
                    if (
                        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
                        video.currentTime !== session.lastVideoTime
                    ) {
                        session.lastVideoTime = video.currentTime;
                        const startedAt = performance.now();
                        const result = recognizer.recognizeForVideo(video, startedAt);
                        const now = performance.now();
                        session.frames++;
                        session.inferenceTotal += now - startedAt;

                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        for (const landmarks of result.landmarks) {
                            drawer.drawConnectors(landmarks, connections, { color: "#14b8a6", lineWidth: 4 });
                            drawer.drawLandmarks(landmarks, { color: "#f59e0b", lineWidth: 1, radius: 4 });
                        }
                        hands = result.landmarks.map((_, i) => ({
                            handedness: result.handedness[i]?.[0]?.categoryName === "Left" ? "Kiri" : "Kanan",
                            gesture: result.gestures[i]?.[0]?.categoryName ?? "None",
                            score: result.gestures[i]?.[0]?.score ?? 0,
                        }));

                        const top = topGesture(result);
                        const name = top && top.score >= MIN_SCORE && GESTURE_PHRASES[top.name] ? top.name : null;
                        if (name !== session.candidate) {
                            session.candidate = name;
                            session.candidateSince = now;
                        }
                        const held = now - session.candidateSince;
                        if (name === null) {
                            if (held >= RELEASE_MS) session.confirmed = null;
                        } else if (name !== session.confirmed && held >= HOLD_MS) {
                            session.confirmed = name;
                            confirmPhrase(GESTURE_PHRASES[name]);
                        }

                        const elapsed = now - session.windowStart;
                        if (elapsed >= STATS_INTERVAL_MS) {
                            setStats({
                                fps: Math.round((session.frames * 1000) / elapsed),
                                inferenceMs: Math.round(session.inferenceTotal / Math.max(session.frames, 1)),
                                delegate,
                                hands,
                                candidate: session.candidate,
                                holdProgress:
                                    session.candidate === null
                                        ? 0
                                        : session.candidate === session.confirmed
                                          ? 1
                                          : Math.min(held / HOLD_MS, 1),
                            });
                            session.frames = 0;
                            session.inferenceTotal = 0;
                            session.windowStart = now;
                        }
                    }
                    session.rafId = requestAnimationFrame(tick);
                } catch (error) {
                    console.error("[mediapipe] Detection failed", error);
                    stop();
                    setStatus({ kind: "error", message: "Deteksi tangan berhenti karena error. Coba nyalakan ulang." });
                }
            };

            setStatus({ kind: "running" });
            session.rafId = requestAnimationFrame(tick);
        } catch (error) {
            if (isStale()) return releaseSession(session);
            console.error("[mediapipe] Failed to start", error);
            stop();
            setStatus({ kind: "error", message: describeError(error) });
        }
    };

    const sentence = phrases.length ? `${phrases.join(". ")}.` : "";

    const saveToLog = async () => {
        setSaving(true);
        try {
            await api("/sign-logs", {
                method: "POST",
                body: JSON.stringify({ transcript: sentence, source: "CAMERA" }),
            });
            toast.success("Tersimpan ke log isyarat.");
        } catch {
            // api() already shows the error toast.
        } finally {
            setSaving(false);
        }
    };

    const busy = status.kind === "loading" || status.kind === "running";
    const lastPhrase = phrases.at(-1);

    return (
        <main className="mx-auto max-w-6xl px-4 py-8">
            <header className="mb-6 space-y-2">
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">Halaman uji</p>
                <h1 className="text-3xl font-bold">Uji MediaPipe: penerjemah isyarat</h1>
                <p className="max-w-3xl text-muted">
                    Kamera diproses langsung di browser. Video tidak dikirim ke server. Gestur di bawah adalah gestur
                    bawaan MediaPipe yang sementara dipetakan ke frasa kelas, belum isyarat SIBI/BISINDO.
                </p>
            </header>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <section className="space-y-3">
                    <div
                        className="relative overflow-hidden rounded-xl bg-neutral-900"
                        style={{ aspectRatio }}
                        data-testid="camera"
                    >
                        <video
                            ref={videoRef}
                            className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
                            playsInline
                            muted
                            aria-label="Pratinjau kamera"
                        />
                        <canvas
                            ref={canvasRef}
                            className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100"
                        />
                        {status.kind !== "running" && (
                            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white">
                                <p>
                                    {status.kind === "loading"
                                        ? status.step
                                        : status.kind === "error"
                                          ? status.message
                                          : "Kamera belum menyala."}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {busy ? (
                            <button
                                type="button"
                                onClick={stop}
                                className="rounded-lg bg-neutral-800 px-5 py-3 font-semibold text-white"
                            >
                                Matikan kamera
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={start}
                                className="rounded-lg bg-primary px-5 py-3 font-semibold text-white"
                            >
                                {status.kind === "error" ? "Coba lagi" : "Nyalakan kamera"}
                            </button>
                        )}
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={autoSpeak}
                                onChange={(e) => {
                                    setAutoSpeak(e.target.checked);
                                    autoSpeakRef.current = e.target.checked;
                                }}
                                className="h-4 w-4"
                            />
                            Bacakan otomatis
                        </label>
                    </div>
                </section>

                <aside className="space-y-4">
                    <div className="rounded-xl border border-neutral-200 p-4">
                        <h2 className="mb-1 text-sm font-semibold text-muted">Frasa terdeteksi</h2>
                        <p
                            className="min-h-12 text-4xl font-bold text-primary"
                            aria-live="polite"
                            data-testid="last-phrase"
                        >
                            {lastPhrase ?? "–"}
                        </p>
                        {stats?.candidate && (
                            <div className="mt-3">
                                <p className="mb-1 text-sm">Tahan gestur: {GESTURE_PHRASES[stats.candidate]}</p>
                                <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
                                    <div
                                        className="h-full bg-primary transition-[width]"
                                        style={{ width: `${Math.round(stats.holdProgress * 100)}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="rounded-xl border border-neutral-200 p-4">
                        <h2 className="mb-2 text-sm font-semibold text-muted">Kalimat</h2>
                        <p className="min-h-6" data-testid="sentence">
                            {sentence || "Belum ada frasa."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => speak(sentence)}
                                disabled={!sentence}
                                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-40"
                            >
                                Bacakan
                            </button>
                            <button
                                type="button"
                                onClick={saveToLog}
                                disabled={!sentence || saving}
                                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-40"
                            >
                                {saving ? "Menyimpan…" : "Simpan ke log"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setPhrases([])}
                                disabled={!sentence}
                                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-40"
                            >
                                Hapus
                            </button>
                        </div>
                    </div>

                    <div className="rounded-xl border border-neutral-200 p-4 text-sm">
                        <h2 className="mb-2 font-semibold text-muted">Data MediaPipe</h2>
                        {stats ? (
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-1" data-testid="stats">
                                <dt className="text-muted">Kecepatan</dt>
                                <dd>{stats.fps} FPS</dd>
                                <dt className="text-muted">Waktu proses</dt>
                                <dd>{stats.inferenceMs} ms/frame</dd>
                                <dt className="text-muted">Mode</dt>
                                <dd>{stats.delegate}</dd>
                                <dt className="text-muted">Tangan</dt>
                                <dd data-testid="hand-count">{stats.hands.length}</dd>
                                {stats.hands.map((hand, i) => (
                                    // Hands have no stable id; index order is MediaPipe's output order.
                                    // biome-ignore lint/suspicious/noArrayIndexKey: see above
                                    <div key={i} className="col-span-2 mt-1 rounded bg-neutral-100 px-2 py-1">
                                        Tangan {hand.handedness}: {GESTURE_LABELS[hand.gesture] ?? hand.gesture}{" "}
                                        <span className="text-muted">({Math.round(hand.score * 100)}%)</span>
                                    </div>
                                ))}
                            </dl>
                        ) : (
                            <p className="text-muted">Nyalakan kamera untuk melihat data deteksi.</p>
                        )}
                    </div>

                    <div className="rounded-xl border border-neutral-200 p-4 text-sm">
                        <h2 className="mb-2 font-semibold text-muted">Gestur yang bisa dicoba</h2>
                        <ul className="space-y-1">
                            {Object.entries(GESTURE_PHRASES).map(([gesture, phrase]) => (
                                <li key={gesture} className="flex justify-between gap-4">
                                    <span>{GESTURE_LABELS[gesture]}</span>
                                    <span className="font-semibold">{phrase}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>
            </div>
        </main>
    );
}
