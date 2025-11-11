"use client";

export default function TrackRolloutPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Track Rollout</h1>
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-12 text-center">
        <div className="text-6xl mb-4">🚀</div>
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Track Rollout</h2>
        <p className="text-gray-500 text-lg">
          หน้านี้อยู่ระหว่างการพัฒนา
        </p>
        <p className="text-gray-400 mt-2">
          รอดำเนินการ...
        </p>
      </div>
    </div>
  );
}
