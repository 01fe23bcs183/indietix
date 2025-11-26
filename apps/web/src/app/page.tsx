import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Welcome to IndieTix</h1>
        <p className="text-lg text-gray-600 mb-8">
          Discover and book amazing events in your city
        </p>
        <Link
          href="/events"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Browse Events
        </Link>
      </div>
    </main>
  );
}
