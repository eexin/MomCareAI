export default function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-[3px] ml-0.5">
      <span className="dot-1 w-[5px] h-[5px] rounded-full bg-current inline-block" />
      <span className="dot-2 w-[5px] h-[5px] rounded-full bg-current inline-block" />
      <span className="dot-3 w-[5px] h-[5px] rounded-full bg-current inline-block" />
    </span>
  );
}
