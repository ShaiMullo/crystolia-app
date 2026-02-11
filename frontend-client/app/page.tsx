
import LeadForm from "../components/LeadForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-extrabold text-blue-900 leading-tight">
            Transform Your Business with <span className="text-blue-600">Crystolia</span>
          </h1>
          <p className="text-lg text-gray-600">
            Premium ERP & CRM solutions tailored for your growth. scalable, secure, and designed for modern businesses.
          </p>
          <div className="flex space-x-4">
            <div className="flex items-center space-x-2 text-gray-700">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>24/7 Support</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-700">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Cloud Native</span>
            </div>
          </div>
        </div>

        <div>
          <LeadForm />
        </div>
      </div>
    </main>
  );
}