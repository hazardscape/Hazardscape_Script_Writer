import { useState } from "react";
import ScriptForm from "./components/ScriptForm.jsx";
import ScriptDisplay from "./components/ScriptDisplay.jsx";
import ScriptHistory from "./components/ScriptHistory.jsx";
import styles from "./App.module.css";

const HISTORY_KEY = "hazardscape_script_history";

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

async function streamInto(url, body, onChunk) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Server error");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value, { stream: true }).split("\n")) {
      if (!line.startsWith("data: ")) continue;
      try {
        const payload = JSON.parse(line.slice(6));
        if (payload.error) throw new Error(payload.error);
        if (payload.done) return;
        if (payload.text) onChunk(payload.text);
      } catch (e) {
        if (e.message !== "Unexpected end of JSON input") throw e;
      }
    }
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState("write");
  const [script, setScript] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPartial, setIsPartial] = useState(false);
  const [currentMeta, setCurrentMeta] = useState(null);
  const [history, setHistory] = useState(loadHistory);
  const [error, setError] = useState("");

  function persistEntry(meta, text, partial) {
    const entry = {
      id: Date.now(),
      title: meta.title,
      scriptType: meta.scriptType,
      tone: meta.tone,
      duration: meta.duration,
      script: text,
      partial,
      createdAt: new Date().toISOString(),
    };
    const updated = [entry, ...history].slice(0, 20);
    setHistory(updated);
    saveHistory(updated);
    return entry;
  }

  async function handleGenerate(formData) {
    setError("");
    setScript("");
    setIsPartial(false);
    setIsGenerating(true);
    setCurrentMeta(formData);
    setActiveTab("result");

    let fullScript = "";
    try {
      await streamInto("/api/generate-script", formData, (chunk) => {
        fullScript += chunk;
        setScript(fullScript);
      });
      persistEntry(formData, fullScript, false);
    } catch (err) {
      setError(err.message);
      if (fullScript) {
        setIsPartial(true);
        persistEntry(formData, fullScript, true);
      }
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleContinue() {
    if (!currentMeta || !script) return;
    setError("");
    setIsPartial(false);
    setIsGenerating(true);

    let continued = script;
    try {
      await streamInto(
        "/api/continue-script",
        { partialScript: script, ...currentMeta },
        (chunk) => {
          continued += chunk;
          setScript(continued);
        }
      );
      persistEntry(currentMeta, continued, false);
    } catch (err) {
      setError(err.message);
      if (continued !== script) {
        setIsPartial(true);
        persistEntry(currentMeta, continued, true);
      }
    } finally {
      setIsGenerating(false);
    }
  }

  function handleLoadHistory(entry) {
    setCurrentMeta(entry);
    setScript(entry.script);
    setIsPartial(entry.partial || false);
    setActiveTab("result");
  }

  function handleDeleteHistory(id) {
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    saveHistory(updated);
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>⚡</span>
            <div>
              <div className={styles.logoTitle}>Hazardscape</div>
              <div className={styles.logoSub}>Script Writer</div>
            </div>
          </div>
          <nav className={styles.nav}>
            <button
              className={`${styles.navBtn} ${activeTab === "write" ? styles.navBtnActive : ""}`}
              onClick={() => setActiveTab("write")}
            >
              Write Script
            </button>
            <button
              className={`${styles.navBtn} ${activeTab === "result" ? styles.navBtnActive : ""}`}
              onClick={() => setActiveTab("result")}
              disabled={!script && !isGenerating}
            >
              Current Script
            </button>
            <button
              className={`${styles.navBtn} ${activeTab === "history" ? styles.navBtnActive : ""}`}
              onClick={() => setActiveTab("history")}
            >
              History
              {history.length > 0 && (
                <span className={styles.badge}>{history.length}</span>
              )}
            </button>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        {activeTab === "write" && (
          <ScriptForm onGenerate={handleGenerate} isGenerating={isGenerating} />
        )}
        {activeTab === "result" && (
          <ScriptDisplay
            script={script}
            isGenerating={isGenerating}
            isPartial={isPartial}
            meta={currentMeta}
            error={error}
            onNewScript={() => setActiveTab("write")}
            onContinue={handleContinue}
          />
        )}
        {activeTab === "history" && (
          <ScriptHistory
            history={history}
            onLoad={handleLoadHistory}
            onDelete={handleDeleteHistory}
          />
        )}
      </main>
    </div>
  );
}
