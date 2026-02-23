export default function Spinner({ size = 6 }: { size?: number }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full border-2 border-gray-200 border-t-emerald-600 animate-spin`}
      role="status"
      aria-label="Loading"
    />
  );
}
