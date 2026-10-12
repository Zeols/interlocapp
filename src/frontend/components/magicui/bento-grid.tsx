import { ReactNode } from "react";
import { cn } from "@/frontend/lib/utils";
import Icon from "@mdi/react";
import { mdiArrowRight } from "@mdi/js";

const BentoGrid = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-1 md:grid-cols-3 gap-4",
        className,
      )}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  IconPath,
  description,
  href,
  cta,
  iconClassName,
  textClassName = "text-neutral-700",
  descriptionClassName = "text-neutral-500",
}: {
  name: string;
  className?: string;
  background: ReactNode;
  IconPath: string;
  description: string;
  href: string;
  cta: string;
  iconClassName?: string;
  textClassName?: string;
  descriptionClassName?: string;
}) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-3xl",
      "[box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
      "transform-gpu",
      className || "bg-white",
    )}
  >
    <div className="absolute inset-0">{background}</div>
    <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 p-8 transition-all duration-300 group-hover:-translate-y-10">
      <div className={cn("h-14 w-14 origin-left transform-gpu transition-all duration-300 ease-in-out group-hover:scale-75 flex items-center justify-center rounded-2xl mb-4", iconClassName || "bg-gray-100 text-neutral-700")}>
        <Icon path={IconPath} size={1.2} />
      </div>
      <h3 className={cn("text-xl font-bold", textClassName)}>
        {name}
      </h3>
      <p className={cn("max-w-lg leading-relaxed", descriptionClassName)}>{description}</p>
    </div>

    <div
      className={cn(
        "pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100",
      )}
    >
      <a 
        href={href}
        className="pointer-events-auto inline-flex items-center justify-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 rounded-md"
      >
        {cta}
        <Icon path={mdiArrowRight} size={0.7} className="ml-2" />
      </a>
    </div>
    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[.03] group-hover:dark:bg-neutral-800/10" />
  </div>
);

export { BentoCard, BentoGrid };
