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
  
  if (import.meta.env.DEV) {
    console.log("CsvImport disabled:", disabled);
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("CSV file too large. Maximum size is 5MB.");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          if (results.data.length === 0) {
            toast.error("CSV file is empty");
            return;
          }

          // Validate row count (max 5000 rows)
          if (results.data.length > 5000) {
            toast.error("CSV has too many rows. Maximum is 5000 rows per import.");
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
          if (import.meta.env.DEV) {
            console.error("Import error:", error);
          }
          toast.error("Failed to import data");
        } finally {
          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      },
      error: (error) => {
        if (import.meta.env.DEV) {
          console.error("CSV parsing error:", error);
        }
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
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className="min-w-[120px]"
      >
        <Upload className="w-4 h-4 mr-2" />
        Import CSV
      </Button>
    </>
  );
}
