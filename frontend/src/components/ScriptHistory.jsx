import styles from "./ScriptHistory.module.css";

export default function ScriptHistory({ history, onLoad, onDelete }) {
  if (history.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>📚</div>
        <h2>No Scripts Yet</h2>
        <p>Generated scripts are saved here automatically.</p>
      </div>
    );
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function wordCount(text) {
    return text.split(/\s+/).filter(Boolean).length;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Script History</h2>
        <span className={styles.count}>{history.length} script{history.length !== 1 ? "s" : ""}</span>
      </div>
      <div className={styles.list}>
        {history.map((entry) => (
          <div key={entry.id} className={styles.card}>
            <div className={styles.cardTop}>
              <span className={styles.typeTag}>
                {entry.scriptType === "podcast" ? "🎙️ Podcast" : "▶️ YouTube"}
              </span>
              <span className={styles.date}>{formatDate(entry.createdAt)}</span>
            </div>
            <h3 className={styles.cardTitle}>{entry.title}</h3>
            <div className={styles.cardMeta}>
              <span className={styles.pill}>{entry.tone}</span>
              <span className={styles.pill}>~{entry.duration} min</span>
              <span className={styles.pill}>{wordCount(entry.script)} words</span>
            </div>
            <p className={styles.preview}>
              {entry.script.slice(0, 160)}...
            </p>
            <div className={styles.cardActions}>
              <button className={styles.loadBtn} onClick={() => onLoad(entry)}>
                Open Script
              </button>
              <button
                className={styles.deleteBtn}
                onClick={() => onDelete(entry.id)}
                title="Delete"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
