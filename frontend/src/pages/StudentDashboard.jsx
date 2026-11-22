
import Dashboard from "./Dashboard.jsx";

export default function StudentDashboard() {
  const user = JSON.parse(
    localStorage.getItem("skillbridge_user") || "null"
  );

  if (user?.role !== "student") {
    return <main className="page-wrap"><h1>Student access required</h1></main>;
  }

  return <Dashboard />;
}
