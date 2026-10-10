import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type BackButtonProps = {
  to?: string;
  label?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
};

export default function BackButton({
  to,
  label = "Voltar",
  variant = "outline",
  size = "default",
  className,
}: BackButtonProps) {
  const navigate = useNavigate();

  const content = (
    <Button
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
      aria-label={label}
      onClick={!to ? () => navigate(-1) : undefined}
    >
      <ArrowLeft className="w-4 h-4" />
      <span>{label}</span>
    </Button>
  );

  if (to) {
    return <Link to={to}>{content}</Link>;
  }
  return content;
}
