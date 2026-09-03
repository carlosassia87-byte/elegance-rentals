import React from "react";

export function LogoCasaDelDisfraz({ className = "w-48" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center select-none text-center ${className}`}>
      {/* Gráfico del Sombrero de Arlequín / Máscara de Disfraz */}
      <div className="relative mb-0.5">
        <svg
          viewBox="0 0 160 85"
          className="h-16 w-32 drop-shadow-md"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Sombrero de bufón / fiesta con picos */}
          <path
            d="M 20,65 C 10,40 25,15 45,22 C 55,26 65,45 80,45 C 95,45 105,26 115,22 C 135,15 150,40 140,65 Z"
            fill="#B80036"
            stroke="#800020"
            strokeWidth="2"
          />
          {/* Pico central amarillo/verde */}
          <path
            d="M 60,45 C 70,15 80,5 80,5 C 80,5 90,15 100,45 Z"
            fill="#FFCC00"
            stroke="#D4A000"
            strokeWidth="2"
          />
          {/* Cascabeles */}
          <circle cx="45" cy="22" r="5.5" fill="#FFD700" stroke="#B8860B" strokeWidth="1.5" />
          <circle cx="80" cy="5" r="5.5" fill="#FFD700" stroke="#B8860B" strokeWidth="1.5" />
          <circle cx="115" cy="22" r="5.5" fill="#FFD700" stroke="#B8860B" strokeWidth="1.5" />

          {/* Antifaz / Máscara negra con detalles morados */}
          <path
            d="M 30,55 C 40,48 60,48 70,55 C 75,58 85,58 90,55 C 100,48 120,48 130,55 C 135,62 130,72 115,75 C 95,78 85,68 80,68 C 75,68 65,78 45,75 C 30,72 25,62 30,55 Z"
            fill="#1A1A2E"
            stroke="#FFD700"
            strokeWidth="1.5"
          />
          {/* Ojos de la máscara */}
          <ellipse cx="52" cy="62" rx="8" ry="4.5" fill="#FFFFFF" transform="rotate(-5 52 62)" />
          <ellipse cx="108" cy="62" rx="8" ry="4.5" fill="#FFFFFF" transform="rotate(5 108 62)" />
          <circle cx="53" cy="62" r="3" fill="#00A8FF" />
          <circle cx="107" cy="62" r="3" fill="#00A8FF" />

          {/* Corona pequeña sobre el texto */}
          <path
            d="M 72,32 L 75,25 L 80,28 L 85,25 L 88,32 Z"
            fill="#FFD700"
            stroke="#B8860B"
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* Tipografía 3D Característica del Logo */}
      <div className="flex items-center justify-center gap-0.5 leading-none -mt-2">
        <span className="text-xl font-black italic tracking-tighter text-[#1A237E] drop-shadow-sm font-serif">
          La
        </span>
        <span className="text-2xl font-black uppercase tracking-tight text-[#000000] drop-shadow-[0_2px_0_#FFD700] ml-0.5">
          Casa
        </span>
      </div>

      <div className="flex items-center justify-center gap-0.5 leading-none -mt-1">
        <span className="text-sm font-black italic text-[#8B008B] font-serif mr-0.5">
          Del
        </span>
        <span className="text-2xl font-black tracking-tight text-[#2E7D32] drop-shadow-[0_1.5px_0_#FFD700] uppercase font-sans">
          Disfraz
        </span>
      </div>

      {/* Eslogan */}
      <span className="text-[8.5px] font-bold text-slate-700 italic tracking-tight leading-none mt-1">
        Para toda ocasión sin importar tu edad
      </span>

      {/* SERVIDOR en Rojo Destacado */}
      <span className="text-sm font-black text-[#E60000] uppercase tracking-widest leading-none mt-1.5 drop-shadow-sm">
        SERVIDOR
      </span>
    </div>
  );
}
