interface NotFoundPageProps {
  onNavigateHome: () => void;
}

export default function NotFoundPage({ onNavigateHome }: NotFoundPageProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[75vh] px-6 text-center">
      <h1 className="text-[10rem] md:text-[14rem] font-black leading-none text-neutral-200 select-none tracking-tighter">
        404
      </h1>
      
      <h2 className="text-3xl md:text-5xl font-extrabold text-neutral-900 mt-2 mb-4 tracking-tight">
        Page introuvable
      </h2>

      <p className="text-neutral-500 max-w-lg mb-8 text-sm md:text-base leading-relaxed">
        Désolé, la page que vous recherchez n'existe pas, a été déplacée ou est temporairement indisponible.
      </p>

      <button
        onClick={onNavigateHome}
        className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-semibold rounded-2xl text-white bg-neutral-900 hover:bg-neutral-800 transition-all duration-200 shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Retourner à l'accueil
      </button>
    </div>
  );
}
