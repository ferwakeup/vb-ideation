/**
 * Loading spinner component
 */
export default function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center p-12">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
    </div>
  );
}
