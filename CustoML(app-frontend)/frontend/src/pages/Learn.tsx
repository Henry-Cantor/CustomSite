import LearnLayout from "../components/Learn/LearnLayout";
import QuickGuide from "../components/Learn/QuickGuide";

export default function LearnPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Always show QuickGuide at the top */}
      <QuickGuide />
      {/* LearnLayout handles sidebar + routing */}
      <LearnLayout />
    </div>
  );
}