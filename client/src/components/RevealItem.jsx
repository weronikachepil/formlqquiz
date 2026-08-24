import { useReveal } from "../hooks/useReveal";

export default function RevealItem({ as: Tag = "div", delay = 0, className = "", children, ...props }) {
  const { ref, className: revealClass } = useReveal();
  return (
    <Tag ref={ref} className={`${revealClass} ${className}`} style={{ transitionDelay: `${delay}s` }} {...props}>
      {children}
    </Tag>
  );
}
