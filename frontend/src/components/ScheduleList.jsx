import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAppData } from "../context/AppDataContext";

const BOOK_STYLES = [
  { bg: "var(--high-tint)", border: "var(--high)", accent: "var(--high)" },
  { bg: "var(--medium-tint)", border: "var(--medium)", accent: "var(--medium)" },
  { bg: "var(--low-tint)", border: "var(--low)", accent: "var(--low)" },
];

function truncateFilename(name, max = 28) {
  if (name.length <= max) return name;
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  const base = name.slice(0, name.length - ext.length);
  return `${base.slice(0, max - ext.length - 1)}…${ext}`;
}

export default function ScheduleList() {
  const navigate = useNavigate();
  const { syllabi, plansBySyllabus, loading, addSyllabus, deleteSyllabus } = useAppData();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const fileInput = useRef(null);

  function handleSelectSyllabus(syllabusId) {
    const plan = plansBySyllabus[syllabusId];
    if (plan?.id) navigate(`/schedule/${plan.id}`);
    else navigate(`/topics/${syllabusId}`);
  }

  async function handleFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const res = await api.uploadSyllabus(file);
      addSyllabus(res.data);
      navigate(`/topics/${res.data.id}`);
    } catch (err) {
      setError(err?.response?.data?.detail || "Upload failed. Try another file.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!confirm("Delete this syllabus and its schedules?")) return;
    setError("");
    setDeletingId(id);
    try {
      await deleteSyllabus(id);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not delete syllabus.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="main">
      <div className="eyebrow">Your plans</div>
      <h1>Schedule</h1>
      <p>Upload syllabi and open a generated study plan for any subject.</p>

      <div className="card schedule-upload-card">
        <h3>Upload a syllabus</h3>
        <p className="topic-meta" style={{ marginTop: 0 }}>
          Drop in a PDF with your exam syllabus to generate a new study plan.
        </p>
        <div
          className={`dropzone${dragActive ? " active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => fileInput.current?.click()}
          style={{ cursor: "pointer" }}
        >
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {uploading ? (
            <span className="spinner" />
          ) : (
            <>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>Drop your syllabus PDF here</div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>or click to browse</div>
            </>
          )}
        </div>
        {error && <div className="error-msg" style={{ marginTop: 12 }}>{error}</div>}
      </div>

      <h2 style={{ marginTop: 32, marginBottom: 16 }}>Your syllabi</h2>
      {loading ? (
        <span className="spinner" />
      ) : syllabi.length === 0 ? (
        <p style={{ fontSize: 14 }}>Nothing here yet — upload a syllabus above.</p>
      ) : (
        <div className="bookshelf">
          {syllabi.map((s, index) => {
            const plan = plansBySyllabus[s.id];
            const style = BOOK_STYLES[index % BOOK_STYLES.length];
            return (
              <article
                key={s.id}
                className="book-spine"
                style={{
                  background: style.bg,
                  borderColor: style.border,
                }}
                onClick={() => handleSelectSyllabus(s.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectSyllabus(s.id);
                  }
                }}
              >
                <div className="book-spine-top" style={{ borderBottomColor: style.border }}>
                  <h3 className="book-spine-title" style={{ color: style.accent }}>
                    {truncateFilename(s.filename)}
                  </h3>
                  <p className="book-spine-meta">
                    {s.topics.length} topics
                    <br />
                    {new Date(s.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="book-spine-actions">
                  <span className={`book-spine-link${plan ? " has-plan" : ""}`}>
                    {plan ? "View schedule" : "Set up"}
                  </span>
                  <button
                    type="button"
                    className="btn danger book-spine-delete"
                    disabled={deletingId === s.id}
                    onClick={(e) => handleDelete(s.id, e)}
                    aria-label={`Delete ${s.filename}`}
                  >
                    {deletingId === s.id ? <span className="spinner" /> : "Delete"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
