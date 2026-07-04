import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAppData } from "../context/AppDataContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { syllabi, plansBySyllabus, loading, addSyllabus, deleteSyllabus } = useAppData();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const fileInput = useRef(null);

  function handleSelectSyllabus(syllabusId) {
    const plan = plansBySyllabus[syllabusId];
    if (plan?.id) {
      navigate(`/schedule/${plan.id}`);
    } else {
      navigate(`/topics/${syllabusId}`);
    }
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
      setError(err?.response?.data?.detail || "Could not delete syllabus. Try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="main">
      <div className="eyebrow">Your syllabi</div>
      <h1>Upload a syllabus to get started</h1>
      <p>
        Drop in a PDF with your exam syllabus. If it lists priorities or marks per topic, we'll
        pick those up automatically — otherwise you can set priorities yourself on the next step.
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

      <h2 style={{ marginTop: 40, marginBottom: 16 }}>Previously uploaded</h2>
      {loading ? (
        <span className="spinner" />
      ) : syllabi.length === 0 ? (
        <p style={{ fontSize: 14 }}>Nothing here yet — upload a syllabus above.</p>
      ) : (
        <div className="syllabus-list">
          {syllabi.map((s) => {
            const plan = plansBySyllabus[s.id];
            return (
              <div
                key={s.id}
                className="syllabus-item"
                onClick={() => handleSelectSyllabus(s.id)}
                style={{ cursor: "pointer" }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{s.filename}</div>
                  <div className="topic-meta">
                    {s.topics.length} topics · uploaded {new Date(s.uploaded_at).toLocaleDateString()}
                  </div>
                  <span className={`syllabus-action${plan ? " has-plan" : ""}`}>
                    {plan ? "View schedule" : "Set up schedule"}
                  </span>
                </div>
                <button
                  className="btn danger"
                  disabled={deletingId === s.id}
                  onClick={(e) => handleDelete(s.id, e)}
                >
                  {deletingId === s.id ? <span className="spinner" /> : "Delete"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
