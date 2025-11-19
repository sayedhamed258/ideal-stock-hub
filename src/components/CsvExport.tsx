import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CsvExportProps {
  data: any[];
  filename: string;
  disabled?: boolean;
}

export function CsvExport({ data, filename, disabled }: CsvExportProps) {
  const sanitizeForCSV = (value: any) => {
    if (typeof value === 'string' && (value.startsWith('=') || value.startsWith('+') || value.startsWith('-') || value.startsWith('@'))) {
      return "'" + value;
    }
    return value;
  };

  const handleExport = () => {
    try {
      if (data.length === 0) {
        toast.error("No data to export");
        return;
      }

      const sanitizedData = data.map(row => 
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [key, sanitizeForCSV(value)])
        )
      );

      const csv = Papa.unparse(sanitizedData);
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
      if (import.meta.env.DEV) {
        console.error("Export error:", error);
      }
      toast.error("Failed to export data");
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleExport}
            disabled={disabled}
            className="min-w-[120px] disabled:opacity-70"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{data.length === 0 ? "No records to export" : `Export ${data.length} record${data.length === 1 ? '' : 's'}`}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
