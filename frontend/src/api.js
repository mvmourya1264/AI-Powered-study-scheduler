import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const client = axios.create({ baseURL: API_BASE });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const api = {
  register: (email, password, full_name) =>
    client.post("/auth/register", { email, password, full_name }),

  login: (email, password) => {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    return client.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },

  uploadSyllabus: (file) => {
    const form = new FormData();
    form.append("file", file);
    return client.post("/syllabus/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  listSyllabi: () => client.get("/syllabus/"),
  getSyllabus: (id) => client.get(`/syllabus/${id}`),
  deleteSyllabus: (id) => client.delete(`/syllabus/${id}`),

  addTopic: (syllabusId, topic) => client.post(`/syllabus/${syllabusId}/topics`, topic),
  updateTopic: (topicId, patch) => client.patch(`/syllabus/topics/${topicId}`, patch),
  deleteTopic: (topicId) => client.delete(`/syllabus/topics/${topicId}`),

  generatePlan: (payload) => client.post("/plan/generate", payload),
  listPlans: () => client.get("/plan/"),
  getPlan: (id) => client.get(`/plan/${id}`),
  deletePlan: (id) => client.delete(`/plan/${id}`),
  updateSession: (sessionId, completed) =>
    client.patch(`/plan/sessions/${sessionId}`, { completed }),

  getMe: () => client.get("/users/me"),
  updateMe: (patch) => client.patch("/users/me", patch),
  deleteMe: () => client.delete("/users/me"),
  getProgress: () => client.get("/users/me/progress"),
  getDashboard: () => client.get("/users/me/dashboard"),
  getCalendar: () => client.get("/users/me/calendar"),
  getActivity: () => client.get("/users/me/activity"),
};

export default client;
