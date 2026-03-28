import { useState, useEffect, useRef } from "react";
import styles from "./ScriptDisplay.module.css";

export default function ScriptDisplay({ script, isGenerating, meta, error, onNewScript }) {
  const [copied, setCopied] = useState(false);
  const scriptRef = useRef(null);

  useEffect(() => {
    if (isGenerating && scriptRef.current) {
      scriptRef.current.scrollTop = scriptRef.current.scrollHeight;
    }
  }, [script, isGenerating]);

  function handleCopy() {
    navigator.clipboard.writeText(script).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    const filename = `${meta?.title || "script"}_${new Date().toISOString().slice(0, 10)}.txt`;
    const blob = new Blob([script], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.replace(/[^a-z0-9_\-.]/gi, "_");
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error && !script) {
    return (
      <div className={styles.errorState}>
        <div className={styles.errorIcon}>⚠️</div>
        <h2>Generation Failed</h2>
        <p>{error}</p>
        <button className={styles.newBtn} onClick={onNewScript}>
          Try Again
        </button>
      </div>
    );
  }

  if (!script && !isGenerating) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📄</div>
        <h2>No Script Yet</h2>
        <p>Fill out the form to generate your first script.</p>
        <button className={styles.newBtn} onClick={onNewScript}>
          Write a Script
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {meta && (
        <div className={styles.metaBar}>
          <div className={styles.metaInfo}>
            <span className={styles.typeTag}>
              {meta.scriptType === "podcast" ? "🎙️ Podcast" : "▶️ YouTube"}
            </span>
            <h2 className={styles.scriptTitle}>{meta.title}</h2>
            <span className={styles.metaDetail}>{meta.tone} · ~{meta.duration} min</span>
          </div>
          <div className={styles.actions}>
            {isGenerating && (
              <span className={styles.generatingBadge}>
                <span className={styles.pulse} /> Generating...
              </span>
            )}
            {!isGenerating && script && (
              <>
                <button className={styles.actionBtn} onClick={handleCopy}>
                  {copied ? "✓ Copied!" : "Copy"}
                </button>
                <button className={styles.actionBtn} onClick={handleDownload}>
                  Download
                </button>
                <button className={styles.newBtnSmall} onClick={onNewScript}>
                  New Script
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className={styles.scriptWrapper} ref={scriptRef}>
        <pre className={styles.scriptContent}>{script}</pre>
        {isGenerating && <span className={styles.cursor} />}
      </div>

      {!isGenerating && script && (
        <div className={styles.footer}>
          <span className={styles.wordCount}>
            {script.split(/\s+/).filter(Boolean).length} words
          </span>
          <div className={styles.footerActions}>
            <button className={styles.actionBtn} onClick={handleCopy}>
              {copied ? "✓ Copied!" : "Copy Script"}
            </button>
            <button className={styles.actionBtn} onClick={handleDownload}>
              Download .txt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
