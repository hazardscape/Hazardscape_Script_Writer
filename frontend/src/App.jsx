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

export default function App() {
  const [activeTab, setActiveTab] = useState("write");
  const [script, setScript] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentMeta, setCurrentMeta] = useState(null);
  const [history, setHistory] = useState(loadHistory);
  const [error, setError] = useState("");

  async function handleGenerate(formData) {
    setError("");
    setScript("");
    setIsGenerating(true);
    setCurrentMeta(formData);
    setActiveTab("result");

    try {
      const response = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Server error");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullScript = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.error) throw new Error(payload.error);
            if (payload.done) break;
            if (payload.text) {
              fullScript += payload.text;
              setScript(fullScript);
            }
          } catch (parseErr) {
            if (parseErr.message !== "Unexpected end of JSON input") {
              throw parseErr;
            }
          }
        }
      }

      // Save to history
      const entry = {
        id: Date.now(),
        title: formData.title,
        scriptType: formData.scriptType,
        tone: formData.tone,
        duration: formData.duration,
        script: fullScript,
        createdAt: new Date().toISOString(),
      };
      const updated = [entry, ...history].slice(0, 20);
      setHistory(updated);
      saveHistory(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleLoadHistory(entry) {
    setCurrentMeta(entry);
    setScript(entry.script);
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
            meta={currentMeta}
            error={error}
            onNewScript={() => setActiveTab("write")}
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
