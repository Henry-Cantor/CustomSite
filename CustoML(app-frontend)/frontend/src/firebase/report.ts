// ✅ generateReport.ts (new, clean version)
import jsPDF from "jspdf";

interface ReportSections {
  intro: string;
  methods: string;
  results: string;
  conclusion: string;
}

export function generateReport(
  project: any,
  advanced: boolean,
  customSections: ReportSections
) {
  const doc = new jsPDF();
  const marginLeft = 15;
  const pageWidth = 180;
  let y = 20;

  const addWrappedText = (
    text: string,
    fontSize: number,
    addY: number = 10
  ) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, pageWidth);
    doc.text(lines, marginLeft, y);
    y += lines.length * addY;
  };

  doc.setFontSize(22);
  doc.text(project.name, marginLeft, y);
  y += 12;

  doc.setFontSize(12);
  addWrappedText(`Description: ${project.description || "N/A"}`, 12);

  doc.setFontSize(14);
  doc.text("Overview", marginLeft, y);
  y += 8;

  const { modelType, dataType, datasetName, preprocessing = {}, layers, layersize, kernelsize, padding, epochs, batchsize, metrics = {} } = project;

  addWrappedText(`Model Type: ${modelType}`, 11);
  addWrappedText(`Data Type: ${dataType}`, 11);
  addWrappedText(`Dataset: ${datasetName}`, 11);
  addWrappedText(`Preprocessing: ${Object.entries(preprocessing).map(([k, v]) => `${k}: ${v}`).join(", ") || "N/A"}`, 11);
  addWrappedText(`Architecture: Layers=${layers}, Layer Size=${layersize}, Kernel Size=${kernelsize}, Padding=${padding}`, 11);
  addWrappedText(`Training: Epochs=${epochs}, Batch Size=${batchsize}`, 11);

  if (metrics.accuracy !== undefined)
    addWrappedText(`Accuracy: ${metrics.accuracy.toFixed(3)}`, 11);
  if (metrics.mae !== undefined)
    addWrappedText(`MAE: ${metrics.mae.toFixed(3)}`, 11);
  if (metrics.r2 !== undefined)
    addWrappedText(`R^2: ${metrics.mae.toFixed(3)}`, 11);

  if (advanced) {
    doc.setFontSize(16);
    doc.text("Introduction", marginLeft, y);
    y += 10;
    addWrappedText(customSections.intro, 12);

    doc.setFontSize(16);
    doc.text("Methods", marginLeft, y);
    y += 10;
    addWrappedText(customSections.methods, 12);

    doc.setFontSize(16);
    doc.text("Results", marginLeft, y);
    y += 10;
    addWrappedText(customSections.results, 12);

    try {
      if (project.graphURLs?.loss) {
        doc.addImage(project.graphURLs.loss, "PNG", marginLeft, y, pageWidth / 2 - 5, 60);
      }
      if (project.graphURLs?.evaluation) {
        doc.addImage(project.graphURLs.evaluation, "PNG", marginLeft + pageWidth / 2 + 5, y, pageWidth / 2 - 5, 60);
      }
      y += 70;
    } catch {}

    doc.setFontSize(16);
    doc.text("Conclusion", marginLeft, y);
    y += 10;
    addWrappedText(customSections.conclusion, 12);
  } else {
    doc.setFontSize(16);
    doc.text("Summary", marginLeft, y);
    y += 10;
    addWrappedText(`Model: ${modelType}\nData: ${dataType}\nAccuracy: ${metrics.accuracy ?? "N/A"}\nMAE: ${metrics.mae ?? "N/A"}\nR^2: ${metrics.r2 ?? "N/A"}`, 12);

    try {
      if (project.graphURLs?.evaluation) {
        doc.addImage(project.graphURLs.evaluation, "PNG", marginLeft, y, 100, 60);
        y += 70;
      }
    } catch {}
  }

  doc.save(`${project.name}_report.pdf`);
}
