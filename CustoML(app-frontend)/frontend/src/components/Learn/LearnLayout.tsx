import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";

export default function LearnLayout() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 bg-gray-50 overflow-auto">
        <div className="bg-white p-6 rounded-lg shadow">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
