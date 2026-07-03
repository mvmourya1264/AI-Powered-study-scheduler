import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

const PRIORITIES = ["high", "medium", "low"];

export default function TopicsReview() {
  const navigate = useNavigate();
  const { syllabusId } = useParams();
  const id = Number(syllabusId);

  const [syllabus, setSyllabus] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [totalDays, setTotalDays] = useState(14);
  const [hoursPerDay, setHoursPerDay] = useState(3);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const res = await api.getSyllabus(id);
    setSyllabus(res.data);
  }

  async function setPriority(topic, priority) {
    setSyllabus((prev) => ({
      ...prev,
      topics: prev.topics.map((t) => (t.id === topic.id ? { ...t, priority } : t)),
    }));
    await api.updateTopic(topic.id, { priority });
  }

  async function addTopic() {
    if (!newTitle.trim()) return;
    const res = await api.addTopic(id, {
      title: newTitle.trim(),
      priority: "medium",
      weight: 1.0,
      order_index: syllabus.topics.length,
    });
    setSyllabus((prev) => ({ ...prev, topics: [...prev.topics, res.data] }));
    setNewTitle("");
  }

  async function removeTopic(topicId) {
    await api.deleteTopic(topicId);
    setSyllabus((prev) => ({ ...prev, topics: prev.topics.filter((t) => t.id !== topicId) }));
  }

  async function handleGenerate() {
    setError("");
    if (!syllabus.topics.length) {
      setError("Add at least one topic before generating a plan.");
      return;
    }
    setGenerating(true);
    try {
      const res = await api.generatePlan({
        syllabus_id: id,
        total_days: Number(totalDays),
        hours_per_day: Number(hoursPerDay),
        start_date: startDate ? new Date(startDate).toISOString() : null,
      });
      navigate(`/schedule/${res.data.id}`);
    } catch (err) {
      setError(err?.response?.data?.detail || "Couldn't generate the plan.");
    } finally {
      setGenerating(false);
    }
  }

  if (!syllabus) return <div className="main"><span className="spinner" /></div>;

  return (
    <div className="main">
      <button
        className="btn ghost"
        onClick={() => navigate("/dashboard")}
        style={{ marginBottom: 12, paddingLeft: 0 }}
      >
        ← Back to syllabi
      </button>
      <div className="eyebrow">{syllabus.filename}</div>
      <h1>Review priorities</h1>
      <p>
        We picked up priority/marks where the PDF stated them. Adjust any topic below, or add ones
        we missed, before generating your day-by-day plan.
      </p>

      <div className="card">
        {syllabus.topics.length === 0 && (
          <p style={{ marginBottom: 0 }}>No topics detected yet — add them manually below.</p>
        )}
        {syllabus.topics.map((topic) => (
          <div className="topic-row" key={topic.id}>
            <div>
              <div className="topic-title">{topic.title}</div>
              {topic.marks != null && <div className="topic-meta">{topic.marks} marks</div>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div className="priority-select">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    className={`${p === topic.priority ? "selected " + p : ""}`}
                    onClick={() => setPriority(topic, p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button className="btn ghost" onClick={() => removeTopic(topic.id)}>
                ✕
              </button>
            </div>
          </div>
        ))}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <input
            type="text"
            placeholder="Add a topic we missed…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTopic()}
          />
          <button className="btn secondary" onClick={addTopic}>
            Add
          </button>
        </div>
      </div>

      <h2 style={{ marginTop: 32 }}>Generate your plan</h2>
      <div className="card">
        <div className="row">
          <div className="field">
            <label>Days until exam</label>
            <input type="number" min="1" value={totalDays} onChange={(e) => setTotalDays(e.target.value)} />
          </div>
          <div className="field">
            <label>Hours per day</label>
            <input type="number" min="0.5" step="0.5" value={hoursPerDay} onChange={(e) => setHoursPerDay(e.target.value)} />
          </div>
          <div className="field">
            <label>Start date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <button className="btn" onClick={handleGenerate} disabled={generating}>
          {generating ? <span className="spinner" /> : "Generate schedule"}
        </button>
      </div>
    </div>
  );
}
