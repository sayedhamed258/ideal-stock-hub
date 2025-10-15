import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "warning" | "success";
}

export const MetricCard = ({ title, value, icon: Icon, trend, variant = "default" }: MetricCardProps) => {
  const variantStyles = {
    default: "from-primary/10 to-primary/5 border-primary/20",
    warning: "from-warning/10 to-warning/5 border-warning/20",
    success: "from-success/10 to-success/5 border-success/20"
  };

  const iconStyles = {
    default: "text-primary bg-primary/10",
    warning: "text-warning bg-warning/10",
    success: "text-success bg-success/10"
  };

  return (
    <Card className={`bg-gradient-to-br ${variantStyles[variant]} border-2 hover:shadow-lg transition-shadow`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
          </div>
          <div className={`p-3 rounded-lg ${iconStyles[variant]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
