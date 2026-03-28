import { useState } from "react";
import styles from "./ScriptForm.module.css";

const TONES = [
  { value: "casual", label: "Casual", desc: "Conversational and relaxed" },
  { value: "professional", label: "Professional", desc: "Polished and authoritative" },
  { value: "entertaining", label: "Entertaining", desc: "High energy and fun" },
  { value: "educational", label: "Educational", desc: "Informative and clear" },
  { value: "dramatic", label: "Dramatic", desc: "Intense and gripping" },
];

const DURATIONS = [
  { value: "5", label: "~5 min", sub: "Short & punchy" },
  { value: "10", label: "~10 min", sub: "Standard episode" },
  { value: "20", label: "~20 min", sub: "Deep dive" },
  { value: "30", label: "30+ min", sub: "Long form" },
];

export default function ScriptForm({ onGenerate, isGenerating }) {
  const [form, setForm] = useState({
    scriptType: "podcast",
    title: "",
    topic: "",
    guestName: "",
    keyPoints: "",
    tone: "entertaining",
    duration: "10",
    additionalNotes: "",
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onGenerate(form);
  }

  const isValid = form.title.trim() && form.topic.trim();

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Create Your Script</h1>
        <p className={styles.heroSub}>
          Powered by Claude AI — generate professional podcast & YouTube scripts in seconds
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Script Type */}
        <div className={styles.section}>
          <label className={styles.sectionLabel}>Script Type</label>
          <div className={styles.typeToggle}>
            <button
              type="button"
              className={`${styles.typeBtn} ${form.scriptType === "podcast" ? styles.typeBtnActive : ""}`}
              onClick={() => setForm((p) => ({ ...p, scriptType: "podcast" }))}
            >
              <span className={styles.typeIcon}>🎙️</span>
              <span>Podcast</span>
            </button>
            <button
              type="button"
              className={`${styles.typeBtn} ${form.scriptType === "youtube" ? styles.typeBtnActive : ""}`}
              onClick={() => setForm((p) => ({ ...p, scriptType: "youtube" }))}
            >
              <span className={styles.typeIcon}>▶️</span>
              <span>YouTube</span>
            </button>
          </div>
        </div>

        {/* Title & Topic */}
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="title">
              Episode / Video Title <span className={styles.required}>*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. The Haunting of Waverly Hills"
              className={styles.input}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="guestName">
              Guest / Co-host Name <span className={styles.optional}>(optional)</span>
            </label>
            <input
              id="guestName"
              name="guestName"
              type="text"
              value={form.guestName}
              onChange={handleChange}
              placeholder="e.g. Dr. Jane Smith"
              className={styles.input}
            />
          </div>
        </div>

        {/* Topic */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="topic">
            Topic / Description <span className={styles.required}>*</span>
          </label>
          <textarea
            id="topic"
            name="topic"
            value={form.topic}
            onChange={handleChange}
            placeholder="Describe what this episode or video is about. Include the story, angle, or specific information you want to cover."
            className={`${styles.input} ${styles.textarea}`}
            rows={3}
            required
          />
        </div>

        {/* Key Points */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="keyPoints">
            Key Talking Points <span className={styles.optional}>(one per line)</span>
          </label>
          <textarea
            id="keyPoints"
            name="keyPoints"
            value={form.keyPoints}
            onChange={handleChange}
            placeholder={`e.g.\nThe history of Waverly Hills Sanatorium\nDocumented paranormal activity\nFamous ghost hunting investigations\nVisitor experiences`}
            className={`${styles.input} ${styles.textarea}`}
            rows={4}
          />
        </div>

        {/* Tone */}
        <div className={styles.section}>
          <label className={styles.sectionLabel}>Tone</label>
          <div className={styles.toneGrid}>
            {TONES.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`${styles.toneBtn} ${form.tone === t.value ? styles.toneBtnActive : ""}`}
                onClick={() => setForm((p) => ({ ...p, tone: t.value }))}
              >
                <span className={styles.toneName}>{t.label}</span>
                <span className={styles.toneDesc}>{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className={styles.section}>
          <label className={styles.sectionLabel}>Target Duration</label>
          <div className={styles.durationRow}>
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                className={`${styles.durationBtn} ${form.duration === d.value ? styles.durationBtnActive : ""}`}
                onClick={() => setForm((p) => ({ ...p, duration: d.value }))}
              >
                <span className={styles.durationLabel}>{d.label}</span>
                <span className={styles.durationSub}>{d.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Additional Notes */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="additionalNotes">
            Additional Notes <span className={styles.optional}>(optional)</span>
          </label>
          <textarea
            id="additionalNotes"
            name="additionalNotes"
            value={form.additionalNotes}
            onChange={handleChange}
            placeholder="Any specific instructions, style preferences, sponsor mentions, calls-to-action, etc."
            className={`${styles.input} ${styles.textarea}`}
            rows={2}
          />
        </div>

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={!isValid || isGenerating}
        >
          {isGenerating ? (
            <>
              <span className={styles.spinner} />
              Generating Script...
            </>
          ) : (
            <>
              <span>⚡</span>
              Generate Script
            </>
          )}
        </button>
      </form>
    </div>
  );
}
