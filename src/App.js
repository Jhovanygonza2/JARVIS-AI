import React, { useEffect, useRef, useState, useCallback } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import Orb3D from "./Orb3D";
import "./App.css";

const YT_API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;

function App() {
  const historialRef   = useRef(null);
  const clockRef       = useRef(null);
  const silenceTimer   = useRef(null);
  const lastTranscript = useRef("");
  const analyserRef    = useRef(null);
  // Refs para evitar closures stale en el effect de voz
  const resultadosRef  = useRef([]);

  const { transcript, resetTranscript, listening, browserSupportsSpeechRecognition } = useSpeechRecognition();

  const [historial,   setHistorial]   = useState([]);
  const [cargando,    setCargando]    = useState(false);
  const [estado,      setEstado]      = useState("INICIANDO...");
  const [resultados,  setResultados]  = useState([]);
  const [videoActivo, setVideoActivo] = useState(null);
  const [panelYT,     setPanelYT]     = useState(false);
  const [horaActual,  setHoraActual]  = useState("");
  const [fechaActual, setFechaActual] = useState("");
  const [bootDone,    setBootDone]    = useState(false);
  const [micError,    setMicError]    = useState(false);

  // Mantener resultadosRef sincronizado con el estado
  useEffect(() => { resultadosRef.current = resultados; }, [resultados]);

  /* ============================= */
  /* CLOCK                         */
  /* ============================= */
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setHoraActual(now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setFechaActual(now.toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase());
    };
    tick();
    clockRef.current = setInterval(tick, 1000);
    return () => clearInterval(clockRef.current);
  }, []);

  /* ============================= */
  /* VOZ                           */
  /* ============================= */
  function hablar(texto) {
    window.speechSynthesis.cancel();
    const s = new SpeechSynthesisUtterance(texto);
    s.lang  = "es-MX";
    s.rate  = 0.9;
    s.pitch = 1.1;
    window.speechSynthesis.speak(s);
  }

  /* ============================= */
  /* ABRIR URL (sin popup blocker) */
  /* ============================= */
  function abrirURL(url) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /* ============================= */
  /* ESFERA HOLOGRÁFICA            */
  /* ============================= */
  function iniciarEsfera() {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        const actx     = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = actx.createAnalyser();
        actx.createMediaStreamSource(stream).connect(analyser);
        analyser.fftSize = 256;
        analyserRef.current = analyser;
      })
      .catch((err) => {
        console.warn("Micrófono no disponible:", err);
        setMicError(true);
      });
  }

  /* ============================= */
  /* RESPONDER                     */
  /* ============================= */
  function responder(texto) {
    setHistorial((prev) => [...prev, { usuario: "", jarvis: texto }]);
    hablar(texto);
  }

  /* ============================= */
  /* YOUTUBE: BUSCAR               */
  /* ============================= */
  async function buscarYouTube(query) {
    setCargando(true);
    setEstado("BUSCANDO...");

    if (YT_API_KEY) {
      try {
        const url  = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&type=video&q=${encodeURIComponent(query)}&key=${YT_API_KEY}`;
        const res  = await fetch(url);
        const json = await res.json();

        if (!json.error && json.items && json.items.length > 0) {
          const videos = json.items.map((item) => ({
            id:        item.id.videoId,
            titulo:    item.snippet.title,
            canal:     item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails.medium.url,
          }));
          setResultados(videos);
          setPanelYT(true);
          setVideoActivo(null);
          responder(`Encontré ${videos.length} videos de "${query}". Di el número para reproducir.`);
          setCargando(false);
          setEstado("EN ESPERA");
          return;
        }
      } catch (err) {
        console.error("Error API YouTube:", err);
      }
    }

    // Fallback: abrir YouTube en el navegador
    abrirURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
    responder(`Buscando "${query}" en YouTube.`);
    setCargando(false);
    setEstado("EN ESPERA");
  }

  /* ============================= */
  /* YOUTUBE: REPRODUCIR           */
  /* ============================= */
  function reproducirVideo(video) {
    setVideoActivo(video);
    setResultados([]);
    hablar("Reproduciendo " + video.titulo);
    setHistorial((prev) => [
      ...prev,
      { usuario: "▶ " + video.titulo, jarvis: "Reproduciendo ahora." },
    ]);
  }

  function cerrarVideo() {
    setVideoActivo(null);
    setPanelYT(false);
    setResultados([]);
    hablar("Video cerrado.");
  }

  /* ============================= */
  /* CONVERSACIÓN LOCAL            */
  /* ============================= */
  function conversar(texto) {
    if (texto.includes("como estas") || texto.includes("cómo estás"))
      return "Todos los sistemas operando al máximo rendimiento.";
    if (texto.includes("quien eres") || texto.includes("quién eres"))
      return "Soy Jarvis, tu asistente virtual inteligente.";
    if (texto.includes("que puedes hacer") || texto.includes("qué puedes hacer"))
      return "Puedo buscar videos en YouTube, abrir aplicaciones, decirte la hora y conversar contigo.";
    if (texto.includes("gracias"))
      return "Con gusto. Para eso estoy aquí.";
    if (texto.includes("buenos dias") || texto.includes("buenos días"))
      return "Buenos días. Todos los sistemas en línea.";
    if (texto.includes("buenas tardes"))
      return "Buenas tardes. Listo para recibir instrucciones.";
    if (texto.includes("buenas noches"))
      return "Buenas noches. Iniciando modo de bajo consumo.";
    if (texto.includes("hola"))
      return "Hola. ¿En qué puedo ayudarte?";
    if (texto.includes("adiós") || texto.includes("adios") || texto.includes("hasta luego"))
      return "Hasta luego. Sistemas en espera.";
    if (texto.includes("chiste") || texto.includes("broma"))
      return "¿Por qué los robots nunca mienten? Porque no tienen memoria para sus mentiras.";
    if (texto.includes("nombre"))
      return "Mi nombre es Jarvis. Sistema de asistencia virtual de próxima generación.";
    return "Entendido. ¿Hay algo más en lo que pueda asistirte?";
  }

  /* ============================= */
  /* COMANDOS DE VOZ               */
  /* ============================= */
  async function procesarComando(comando) {
    console.log("🎤 Comando recibido:", comando);
    setCargando(true);
    setEstado("PROCESANDO...");

    // YouTube
    if (
      comando.includes("video de") ||
      comando.includes("busca en youtube") ||
      comando.includes("buscar en youtube") ||
      comando.includes("pon música de") ||
      comando.includes("reproduce") ||
      comando.includes("ponme")
    ) {
      const q = comando
        .replace(/video de|busca en youtube|buscar en youtube|pon música de|reproduce|ponme/g, "")
        .trim();
      await buscarYouTube(q || "música");
      return;
    }

    // Seleccionar video por número
    const resultadosActuales = resultadosRef.current;
    if (resultadosActuales.length > 0) {
      const nums = ["primero", "segundo", "tercero", "cuarto", "quinto", "uno", "dos", "tres", "cuatro", "cinco", "1", "2", "3", "4", "5"];
      const idx  = nums.findIndex((n) => comando.includes(n));
      const realIdx = idx >= 5 ? idx - 5 : idx; // "uno" -> 0, "dos" -> 1, etc.
      if (idx !== -1 && resultadosActuales[realIdx]) {
        reproducirVideo(resultadosActuales[realIdx]);
        setCargando(false);
        setEstado("EN ESPERA");
        return;
      }
    }

    // Cerrar video
    if (
      comando.includes("cerrar video") ||
      comando.includes("detener video") ||
      comando.includes("parar video") ||
      comando.includes("cierra el video") ||
      comando.includes("para el video")
    ) {
      cerrarVideo();
      setCargando(false);
      setEstado("EN ESPERA");
      return;
    }

    let respuesta = "";
    if (comando.includes("hora")) {
      respuesta = "Son las " + new Date().toLocaleTimeString("es-MX");
    } else if (comando.includes("fecha") || comando.includes("día es hoy") || comando.includes("dia es hoy")) {
      respuesta = "Hoy es " + new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    } else if (comando.includes("youtube") && !comando.includes("buscar")) {
      abrirURL("https://youtube.com");
      respuesta = "Abriendo YouTube.";
    } else if (comando.includes("spotify")) {
      const q = comando.replace("spotify", "").trim();
      abrirURL(`https://open.spotify.com/search/${encodeURIComponent(q || "")}`);
      respuesta = q ? `Buscando ${q} en Spotify.` : "Abriendo Spotify.";
    } else if (comando.includes("buscar") || comando.includes("busca")) {
      const q = comando.replace("buscar", "").replace("busca", "").trim();
      abrirURL(`https://www.google.com/search?q=${encodeURIComponent(q)}`);
      respuesta = `Buscando ${q} en Google.`;
    } else if (comando.includes("gmail") || comando.includes("correo")) {
      abrirURL("https://mail.google.com");
      respuesta = "Abriendo Gmail.";
    } else if (comando.includes("drive")) {
      abrirURL("https://drive.google.com");
      respuesta = "Abriendo Google Drive.";
    } else if (comando.includes("whatsapp")) {
      abrirURL("https://web.whatsapp.com");
      respuesta = "Abriendo WhatsApp Web.";
    } else if (comando.includes("mapas") || comando.includes("maps")) {
      abrirURL("https://maps.google.com");
      respuesta = "Abriendo Google Maps.";
    } else if (comando.includes("calculadora")) {
      abrirURL("https://www.google.com/search?q=calculadora");
      respuesta = "Calculadora activada.";
    } else if (comando.includes("traductor") || comando.includes("traducir")) {
      abrirURL("https://translate.google.com");
      respuesta = "Traductor activado.";
    } else if (comando.includes("netflix")) {
      abrirURL("https://www.netflix.com");
      respuesta = "Abriendo Netflix.";
    } else if (comando.includes("instagram")) {
      abrirURL("https://www.instagram.com");
      respuesta = "Abriendo Instagram.";
    } else if (comando.includes("twitter") || comando.includes("twiter")) {
      abrirURL("https://x.com");
      respuesta = "Abriendo X.";
    } else if (comando.includes("github")) {
      abrirURL("https://github.com");
      respuesta = "Abriendo GitHub.";
    } else if (comando.includes("clima") || comando.includes("tiempo en")) {
      const ciudad = comando.replace("clima", "").replace("tiempo en", "").trim();
      abrirURL(`https://www.google.com/search?q=clima+${encodeURIComponent(ciudad || "")}`);
      respuesta = ciudad ? `Buscando el clima de ${ciudad}.` : "Buscando el clima actual.";
    } else {
      respuesta = conversar(comando);
    }

    setHistorial((prev) => [...prev, { usuario: comando, jarvis: respuesta }]);
    hablar(respuesta);
    setCargando(false);
    setEstado("EN ESPERA");
  }

  /* ============================= */
  /* EFECTO — TRANSCRIPT           */
  /* ============================= */
  useEffect(() => {
    if (!transcript || transcript === lastTranscript.current) return;
    lastTranscript.current = transcript;

    if (silenceTimer.current) clearTimeout(silenceTimer.current);

    silenceTimer.current = setTimeout(() => {
      const cmd = transcript.trim();
      if (cmd) {
        procesarComando(cmd.toLowerCase());
        resetTranscript();
        lastTranscript.current = "";
      }
    }, 1500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

  /* ============================= */
  /* EFECTO — SCROLL HISTORIAL     */
  /* ============================= */
  useEffect(() => {
    if (historialRef.current)
      historialRef.current.scrollTop = historialRef.current.scrollHeight;
  }, [historial]);

  /* ============================= */
  /* EFECTO — BOOT                 */
  /* ============================= */
  useEffect(() => {
    iniciarEsfera();

    if (!browserSupportsSpeechRecognition) {
      setEstado("NAVEGADOR SIN SOPORTE");
      return;
    }

    SpeechRecognition.startListening({ continuous: true, language: "es-MX", interimResults: true });

    const t = setTimeout(() => {
      hablar("Sistema Jarvis activado. Listo para recibir instrucciones.");
      setEstado("EN ESPERA");
      setBootDone(true);
    }, 1000);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ============================= */
  /* STATUS CONFIG                 */
  /* ============================= */
  const statusMode = cargando ? "proc" : listening ? "live" : "idle";
  const statusLabels = { proc: "PROCESANDO", live: "ESCUCHANDO", idle: estado };

  /* ============================= */
  /* RENDER                        */
  /* ============================= */
  return (
    <div className={`root ${bootDone ? "booted" : ""}`}>

      {/* ── Fondo decorativo ── */}
      <div className="bg-hex" aria-hidden="true" />
      <div className="bg-vignette" aria-hidden="true" />

      {/* ══════════════════════════════════
          SIDEBAR IZQUIERDO
      ══════════════════════════════════ */}
      <aside className="sidebar-left">
        <div className="sbl-logo">
          <span className="sbl-logo-letter">J</span>
          <span className="sbl-logo-dot" />
        </div>
        <div className="sbl-divider" />
        <div className="sbl-clock">
          <span className="sbl-time">{horaActual}</span>
          <span className="sbl-date">{fechaActual}</span>
        </div>
        <div className="sbl-divider" />
        <div className="sbl-indicators">
          <div className="sbl-ind">
            <span className={`sbl-led ${statusMode === "live" ? "green" : "dim"}`} />
            <span>MIC</span>
          </div>
          <div className="sbl-ind">
            <span className={`sbl-led ${statusMode === "proc" ? "amber" : "dim"}`} />
            <span>PROC</span>
          </div>
          <div className="sbl-ind">
            <span className={`sbl-led ${panelYT ? "cyan" : "dim"}`} />
            <span>YT</span>
          </div>
          {micError && (
            <div className="sbl-ind">
              <span className="sbl-led" style={{ background: "#f87171" }} />
              <span>MIC</span>
            </div>
          )}
        </div>
        <div className="sbl-divider" />
        <div className="sbl-version">v3.1</div>
      </aside>

      {/* ══════════════════════════════════
          COLUMNA CENTRAL
      ══════════════════════════════════ */}
      <main className="col-center">

        {/* — Titulo — */}
        <header className="hud-header">
          <div className="hud-corner tl" />
          <div className="hud-corner tr" />
          <h1 className="hud-title">J·A·R·V·I·S</h1>
          <p className="hud-sub">JUST A RATHER VERY INTELLIGENT SYSTEM</p>
          <div className="hud-corner bl" />
          <div className="hud-corner br" />
        </header>

        {/* — Status pill — */}
        <div className={`status-pill st-${statusMode}`}>
          <span className="st-ring" />
          <span className="st-label">{statusLabels[statusMode]}</span>
        </div>

        {/* — Esfera 3D — */}
        <div className="orb-wrap">
          <Orb3D
            analyser={analyserRef.current}
            listening={statusMode === "live"}
            processing={statusMode === "proc"}
          />
          {transcript && (
            <div className="orb-transcript">
              <span className="orb-cursor">▌</span>{transcript}
            </div>
          )}
        </div>

        {/* — Historial — */}
        <div className="log-panel" ref={historialRef}>
          <div className="log-header">
            <span className="log-title">REGISTRO DE COMANDOS</span>
            <span className="log-count">{historial.length} ENTRADAS</span>
          </div>
          <div className="log-body">
            {historial.length === 0 && (
              <p className="log-empty">
                Sistema listo · Di <em>"video de..."</em> o <em>"abre YouTube"</em>
              </p>
            )}
            {historial.map((item, i) => (
              <div key={i} className="log-entry">
                {item.usuario && (
                  <div className="log-user">
                    <span className="log-tag user-tag">TÚ</span>
                    <span className="log-text">{item.usuario}</span>
                  </div>
                )}
                <div className="log-ai">
                  <span className="log-tag ai-tag">JARVIS</span>
                  <span className="log-text ai-text">{item.jarvis}</span>
                </div>
              </div>
            ))}
            {cargando && (
              <div className="log-ai">
                <span className="log-tag ai-tag">JARVIS</span>
                <div className="typing-dots">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>
        </div>

      </main>

      {/* ══════════════════════════════════
          SIDEBAR DERECHO / PANEL YT
      ══════════════════════════════════ */}
      <aside className={`sidebar-right ${panelYT ? "open" : ""}`}>
        {panelYT ? (
          <div className="yt-dock">
            <div className="yt-dock-header">
              <span className="yt-dock-label">YOUTUBE</span>
              <button className="yt-x" onClick={cerrarVideo}>✕</button>
            </div>

            {videoActivo && (
              <div className="yt-embed-wrap">
                <div className="yt-embed-title">{videoActivo.titulo}</div>
                <iframe
                  width="100%"
                  height="200"
                  src={`https://www.youtube.com/embed/${videoActivo.id}?autoplay=1`}
                  title={videoActivo.titulo}
                  frameBorder="0"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              </div>
            )}

            {resultados.length > 0 && (
              <div className="yt-list">
                {resultados.map((v, i) => (
                  <div key={v.id} className="yt-row" onClick={() => reproducirVideo(v)}>
                    <span className="yt-idx">0{i + 1}</span>
                    <img src={v.thumbnail} alt={v.titulo} className="yt-thumb" />
                    <div className="yt-meta">
                      <p className="yt-vtitle">{v.titulo}</p>
                      <p className="yt-channel">{v.canal}</p>
                    </div>
                  </div>
                ))}
                <p className="yt-voice-hint">Di <b>"pon el primero"</b>, <b>"el segundo"</b>…</p>
              </div>
            )}
          </div>
        ) : (
          <div className="sbr-idle">
            <div className="sbr-commands">
              <p className="sbr-cmd-title">COMANDOS</p>
              {[
                ["video de...",    "Buscar en YouTube"],
                ["hora / fecha",   "Consultar tiempo"],
                ["buscar...",      "Google Search"],
                ["clima de...",    "Ver el clima"],
                ["spotify...",     "Abrir Spotify"],
                ["gmail / drive",  "Google Apps"],
                ["whatsapp",       "WhatsApp Web"],
                ["mapas",          "Google Maps"],
                ["netflix",        "Netflix"],
                ["instagram",      "Instagram"],
                ["github",         "GitHub"],
                ["traductor",      "Translate"],
              ].map(([cmd, desc]) => (
                <div key={cmd} className="sbr-cmd-row">
                  <span className="sbr-cmd-key">{cmd}</span>
                  <span className="sbr-cmd-desc">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

    </div>
  );
}

export default App;