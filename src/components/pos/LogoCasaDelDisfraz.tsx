import React from "react";

export function LogoCasaDelDisfraz({ className = "w-44" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center select-none text-center ${className}`}>
      {/* Imagen Oficial de La Casa Del Disfraz */}
      <img
        src="/logo_casa_del_disfraz.jpg"
        alt="La Casa Del Disfraz - Para toda ocasión sin importar tu edad"
        className="max-h-24 w-auto object-contain drop-shadow-sm"
      />

      {/* SERVIDOR en Rojo Destacado debajo del logo */}
      <span className="text-base font-black text-[#E60000] uppercase tracking-widest leading-none mt-1 drop-shadow-sm font-sans">
        SERVIDOR
      </span>
    </div>
  );
}
