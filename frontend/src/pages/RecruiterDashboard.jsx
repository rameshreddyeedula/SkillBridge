
import Dashboard from "./Dashboard.jsx";

export default function RecruiterDashboard() {
  const user = JSON.parse(
    localStorage.getItem("skillbridge_user") || "null"
  );

  if (user?.role !== "recruiter") {
    return <main className="page-wrap"><h1>Recruiter access required</h1></main>;
  }

  return <Dashboard />;
}
