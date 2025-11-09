import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";

interface CsvExportProps {
  data: any[];
  filename: string;
  disabled?: boolean;
}

export function CsvExport({ data, filename, disabled }: CsvExportProps) {
  const handleExport = () => {
    try {
      if (data.length === 0) {
        toast.error("No data to export");
        return;
      }

      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Data exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={disabled || data.length === 0}
    >
      <Download className="w-4 h-4 mr-2" />
      Export CSV
    </Button>
  );
}
