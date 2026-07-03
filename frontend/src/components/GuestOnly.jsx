import { Navigate } from "react-router-dom";

export default function GuestOnly({ children }) {
  if (localStorage.getItem("token")) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
