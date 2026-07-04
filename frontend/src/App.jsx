import { Navigate, Route, Routes } from "react-router-dom";
import "./styles.css";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import ScheduleList from "./components/ScheduleList";
import TopicsReview from "./components/TopicsReview";
import ScheduleView from "./components/ScheduleView";
import Profile from "./components/Profile";
import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import GuestOnly from "./components/GuestOnly";
import { AppDataProvider } from "./context/AppDataContext";

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly>
            <Auth />
          </GuestOnly>
        }
      />
      <Route
        element={
          <RequireAuth>
            <AppDataProvider>
              <Layout />
            </AppDataProvider>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="schedule" element={<ScheduleList />} />
        <Route path="schedule/:planId" element={<ScheduleView />} />
        <Route path="topics/:syllabusId" element={<TopicsReview />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
