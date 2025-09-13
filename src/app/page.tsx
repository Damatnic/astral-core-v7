export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <main className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Welcome to Astral Core
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Your comprehensive mental health platform providing secure, HIPAA-compliant therapy
          services, wellness tracking, and crisis support.
        </p>
        <div className="flex gap-4 justify-center mb-12">
          <a
            href="/login"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Get Started
          </a>
        </div>
        <div className="mt-16 text-sm text-gray-500">
          Version 0.1.0 | Built with security and care
        </div>
      </main>
    </div>
  );
}