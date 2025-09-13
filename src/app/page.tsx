export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <main className="container px-4 py-16 text-center">
        <h1 className="text-5xl font-bold mb-6">
          Welcome to Astral Core
        </h1>
        <p className="text-xl mb-8 max-w-2xl mx-auto">
          Your comprehensive mental health platform providing secure, HIPAA-compliant therapy
          services, wellness tracking, and crisis support.
        </p>
        <div className="flex gap-4 justify-center mb-8">
          <a
            href="#get-started"
            className="btn btn-primary"
          >
            Get Started
          </a>
        </div>
        <div className="text-sm">
          Version 0.1.0 | Built with security and care
        </div>
      </main>
    </div>
  );
}