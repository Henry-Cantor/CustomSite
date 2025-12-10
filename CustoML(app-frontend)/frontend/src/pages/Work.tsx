import React, { useEffect, useState } from "react";
import { getUserProjects, deleteUserProject } from "../firebase/projects";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { generateReport } from "../firebase/report"; // assumes your generateReport.ts is under utils/

export default function Work() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; projectId?: string }>({ open: false });
  const [reportModal, setReportModal] = useState<{ open: boolean; project?: any }>({ open: false });
  const [advancedReport, setAdvancedReport] = useState(false);
  const [customReportSections, setCustomReportSections] = useState({
    intro: "",
    methods: "",
    results: "",
    conclusion: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      getUserProjects(user.uid).then(setProjects);
    }
  }, [user]);

  const confirmDelete = (projectId: string) => setDeleteModal({ open: true, projectId });
  const cancelDelete = () => setDeleteModal({ open: false, projectId: undefined });

  const handleDelete = async () => {
    if (user && deleteModal.projectId) {
      await deleteUserProject(user.uid, deleteModal.projectId);
      setProjects((prev) => prev.filter((p) => p.id !== deleteModal.projectId));
      setDeleteModal({ open: false });
    }
  };

  const handleTest = (project: any) => {
    navigate("/test", { state: { projectId: project.id } });
  };

  const openReport = (project: any) => {
    setReportModal({ open: true, project });
    setAdvancedReport(false);
    setCustomReportSections({ intro: "", methods: "", results: "", conclusion: "" });
  };

  const generatePdfReport = () => {
    if (!reportModal.project) return;
    generateReport(reportModal.project, advancedReport, customReportSections);
    setReportModal({ open: false });
  };

  return (
    <>
      {/* Projects grid */}
      <div className="p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8">
        {projects.map((proj) => (
          <div
            key={proj.id}
            className="border border-gray-200 rounded-2xl p-6 shadow hover:shadow-md transition"
          >
            <h2 className="text-2xl font-semibold text-purple-700 mb-1">{proj.name}</h2>
            <p className="text-sm text-gray-600 mb-2 italic">{proj.description}</p>

            <div className="text-sm text-gray-800 space-y-1">
              <p><strong>Model:</strong> {proj.modelType}</p>
              <p><strong>Data Type:</strong> {proj.dataType}</p>
              <p><strong>Dataset:</strong> {proj.datasetName}</p>
              <p><strong>Input Columns:</strong> {proj.inputs?.join(", ")}</p>
              <p><strong>Output Column:</strong> {proj.output}</p>
              <p><strong>Saved at:</strong> {proj.location || "N/A"}</p>
              <p><strong>Preprocessing:</strong> {Object.entries(proj.preprocessing || {}).map(([k, v]) => `${k}: ${v}`).join(", ")}</p>
              <p><strong>Architecture:</strong> Layers: {proj.layers}, Layer Size: {proj.layersize}, Kernel Size: {proj.kernelsize}, Padding: {proj.padding}</p>
              <p><strong>Training Params:</strong> Epochs: {proj.epochs}, Batch Size: {proj.batchsize}</p>
              {proj.metrics && (
                <>
                  <p><strong>Metrics:</strong></p>
                  <ul className="list-disc list-inside ml-4">
                    {proj.metrics.accuracy !== undefined && <li>Accuracy: {proj.metrics.accuracy.toFixed(3)}</li>}
                    {proj.metrics.mae !== undefined && <li>MAE: {proj.metrics.mae.toFixed(3)}</li>}
                    {proj.metrics.r2 !== undefined && <li>R^2: {proj.metrics.r2.toFixed(3)}</li>}
                  </ul>
                </>
              )}
            </div>

            {/* Evaluation thumbnail (value2) */}
            {proj.graphs?.some((g: any) => g.name2 && g.value2) && (
              <div className="mt-3">
                <img
                  src={proj.graphs.find((g: any) => g.name2 === "evaluation")?.value2}
                  alt="Evaluation Graph"
                  className="w-full h-32 object-contain rounded bg-gray-50"
                />
              </div>
            )}

            <div className="mt-4 flex gap-3 flex-wrap">
              <button
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                onClick={() => handleTest(proj)}
              >
                Test
              </button>
              <button
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                onClick={() => openReport(proj)}
              >
                Report
              </button>
              <button
                className="bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200"
                onClick={() => confirmDelete(proj.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px] max-w-full">
            <h3 className="text-lg font-semibold mb-4">Are you sure you want to delete this project?</h3>
            <div className="flex justify-end gap-4">
              <button className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400" onClick={cancelDelete}>Cancel</button>
              <button className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Report modal */}
      {reportModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px] max-w-full max-h-[80vh] overflow-auto">
            <h3 className="text-xl font-semibold mb-4">Generate Report: {reportModal.project.name}</h3>

            {/* Thumbnail preview (value2 - evaluation) */}
            {reportModal.project.graphs?.some((g: any) => g.name2 === "evaluation" && g.value2) && (
              <div className="mb-4">
                <img
                  src={reportModal.project.graphs.find((g: any) => g.name2 === "evaluation")?.value2}
                  alt="Evaluation Graph Thumbnail"
                  className="w-48 h-auto rounded border border-gray-200"
                />
              </div>
            )}

            {/* <label className="flex items-center mb-4 space-x-2">
              <input type="checkbox" checked={advancedReport} onChange={() => setAdvancedReport(!advancedReport)} />
              <span>Advanced Mode (customize sections)</span>
            </label> */}

            {advancedReport && (
              <>
                {["intro", "methods", "results", "conclusion"].map((section) => (
                  <div key={section} className="mb-4">
                    <label className="block font-semibold capitalize mb-1" htmlFor={section}>
                      {section.charAt(0).toUpperCase() + section.slice(1)}
                    </label>
                    <textarea
                      id={section}
                      rows={3}
                      className="w-full border rounded px-2 py-1"
                      value={(customReportSections as any)[section]}
                      onChange={(e) =>
                        setCustomReportSections((prev) => ({
                          ...prev,
                          [section]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
              </>
            )}

            <div className="flex justify-end gap-4 mt-6">
              <button
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
                onClick={() => setReportModal({ open: false })}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700"
                onClick={generatePdfReport}
              >
                Generate PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
