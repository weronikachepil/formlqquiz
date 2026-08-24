import { BirdIcon } from "./Icons";

export default function ProductCover({ product, className = "", style }) {
  const base = `relative overflow-hidden rounded-md aspect-[3/4] ${className}`;

  if (product.cover === "algebra") {
    return (
      <div style={style} className={`${base} bg-gradient-to-br from-[#16132b] to-[#241f42] text-white flex flex-col items-center px-3.5 pt-4.5 pb-3.5 text-center`}>
        <div className="text-lg sm:text-xl font-extrabold tracking-tight mt-1 mb-2.5">НМТ АЛГЕБРА</div>
        <div className="bg-white text-[#16132b] text-[10px] font-extrabold tracking-wide rounded-full px-3 py-1 mb-3">
          ПРАКТИЧНИЙ ЗБІРНИК
        </div>
        <ul className="list-none m-0 p-0 text-[10.5px] leading-relaxed text-[#cfc9ea]">
          <li>Тестові завдання</li>
          <li>Завдання на відповідність</li>
          <li>Завдання з відкритою відповіддю</li>
        </ul>
        <BirdIcon className="mt-auto w-8 h-8 opacity-95" />
        <div className="font-script text-[15px] mt-2 text-[#cfc9ea]">formlq</div>
      </div>
    );
  }

  if (product.cover === "flashcards") {
    return (
      <div style={style} className={`${base} bg-gradient-to-br from-accent-dark to-accent text-white flex flex-col items-center justify-center gap-2.5 p-4.5 text-center`}>
        <div className="relative w-[68px] h-[46px] mb-1">
          <span className="absolute inset-0 bg-white rounded-lg shadow-[0_4px_14px_rgba(90,70,170,0.1)] -rotate-[9deg] translate-y-[3px] opacity-55" />
          <span className="absolute inset-0 bg-white rounded-lg shadow-[0_4px_14px_rgba(90,70,170,0.1)] rotate-[5deg] translate-y-[1px] opacity-80" />
          <span className="absolute inset-0 bg-white rounded-lg shadow-[0_4px_14px_rgba(90,70,170,0.1)] -rotate-[2deg]" />
        </div>
        <div className="text-[17px] font-extrabold tracking-tight">КВІЗ-КАРТКИ</div>
        <div className="bg-white text-accent-dark text-[10px] font-extrabold tracking-wide rounded-full px-3 py-1">АЛГЕБРА</div>
        <div className="font-script text-[15px] text-[#e4defc]">formlq</div>
      </div>
    );
  }

  return (
    <div style={style} className={`${base} bg-accent flex items-center justify-center`}>
      <span className="font-script text-3xl font-bold text-[#d9d2ff] -rotate-6">скоро...</span>
    </div>
  );
}
