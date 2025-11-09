import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";

interface CsvImportProps {
  onImport: (data: any[]) => Promise<void>;
  disabled?: boolean;
  acceptedFields?: string[];
}

export function CsvImport({ onImport, disabled, acceptedFields }: CsvImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          if (results.data.length === 0) {
            toast.error("CSV file is empty");
            return;
          }

          // Validate fields if acceptedFields is provided
          if (acceptedFields && acceptedFields.length > 0) {
            const headers = Object.keys(results.data[0] as object);
            const hasRequiredFields = acceptedFields.every(field => 
              headers.some(h => h.toLowerCase() === field.toLowerCase())
            );
            
            if (!hasRequiredFields) {
              toast.error(`CSV must contain these columns: ${acceptedFields.join(", ")}`);
              return;
            }
          }

          await onImport(results.data);
          toast.success(`Successfully imported ${results.data.length} records`);
        } catch (error) {
          console.error("Import error:", error);
          toast.error("Failed to import data");
        } finally {
          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      },
      error: (error) => {
        console.error("CSV parsing error:", error);
        toast.error("Failed to parse CSV file");
      }
    });
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
      >
        <Upload className="w-4 h-4 mr-2" />
        Import CSV
      </Button>
    </>
  );
}
