import Link from "next/link";
import SearchForm from "@/components/SearchForm";
import ApiQuota from "@/components/ApiQuota";
import { Plane, Bell } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Flight Comparator
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ApiQuota />
            <Link
              href="/alerts"
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600
                         bg-white hover:bg-blue-50 border border-slate-200 px-4 py-2 rounded-xl transition-colors"
            >
              <Bell className="w-4 h-4" />
              Mes alertes
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 pt-16 pb-8 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
          Trouvez les{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            meilleurs prix
          </span>
          <br />
          pour vos vols
        </h2>
        <p className="text-lg text-slate-500 mb-10 max-w-2xl mx-auto">
          Comparez les tarifs en temps réel et créez des alertes pour être
          notifié quand le prix baisse.
        </p>
      </section>

      {/* Formulaire de recherche */}
      <section className="max-w-7xl mx-auto px-4 pb-20">
        <SearchForm />
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔍</span>
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">
              Recherche en temps réel
            </h3>
            <p className="text-sm text-slate-500">
              Accédez aux prix actuels des compagnies aériennes du monde entier.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔔</span>
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">
              Alertes de prix
            </h3>
            <p className="text-sm text-slate-500">
              Définissez votre budget et recevez un email dès que le prix passe
              en dessous.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">
              Historique des prix
            </h3>
            <p className="text-sm text-slate-500">
              Suivez l&apos;évolution des tarifs pour réserver au meilleur moment.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-slate-400">
          Flight Comparator — Données fournies par Google Flights
        </div>
      </footer>
    </main>
  );
}
