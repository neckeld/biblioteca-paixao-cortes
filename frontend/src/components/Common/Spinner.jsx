export default function Spinner({ text = 'Carregando...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
      <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>
    </div>
  );
}
