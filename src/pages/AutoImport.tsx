import { useState, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import Papa from "papaparse";

export default function AutoImport() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { canWrite } = useUserRole();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    const isCSV = fileType === 'text/csv' || fileName.endsWith('.csv');
    const isPDF = fileType === 'application/pdf' || fileName.endsWith('.pdf');

    if (!isCSV && !isPDF) {
      toast.error("Please upload a CSV or PDF file");
      return;
    }

    setIsProcessing(true);
    setParsedData([]);

    try {
      let fileContent = "";

      if (isCSV) {
        // Read CSV as text
        fileContent = await file.text();
      } else if (isPDF) {
        // For PDF, we'll send the file directly to the edge function
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-wholesale-file`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to parse PDF file');
        }

        const result = await response.json();
        setParsedData(result.products);
        toast.success(`Successfully extracted ${result.products.length} products from PDF`);
        setIsProcessing(false);
        return;
      }

      // For CSV, call edge function with text content
      const { data, error } = await supabase.functions.invoke('parse-wholesale-file', {
        body: { fileContent, fileType: 'csv' }
      });

      if (error) throw error;

      setParsedData(data.products);
      toast.success(`Successfully extracted ${data.products.length} products`);
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process file');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) {
      toast.error("No data to import");
      return;
    }

    setIsProcessing(true);

    try {
      // Get existing categories and suppliers to match or create new ones
      const { data: categories } = await supabase.from('categories').select('id, name');
      const { data: suppliers } = await supabase.from('suppliers').select('id, name');

      const categoryMap = new Map(categories?.map(c => [c.name.toLowerCase(), c.id]) || []);
      const supplierMap = new Map(suppliers?.map(s => [s.name.toLowerCase(), s.id]) || []);

      const productsToInsert = [];

      for (const product of parsedData) {
        let categoryId = null;
        let supplierId = null;

        // Match or create category
        if (product.category) {
          const categoryNameLower = product.category.toLowerCase();
          if (categoryMap.has(categoryNameLower)) {
            categoryId = categoryMap.get(categoryNameLower);
          } else {
            const { data: newCategory } = await supabase
              .from('categories')
              .insert({ name: product.category })
              .select()
              .single();
            if (newCategory) {
              categoryId = newCategory.id;
              categoryMap.set(categoryNameLower, newCategory.id);
            }
          }
        }

        // Match or create supplier
        if (product.supplier) {
          const supplierNameLower = product.supplier.toLowerCase();
          if (supplierMap.has(supplierNameLower)) {
            supplierId = supplierMap.get(supplierNameLower);
          } else {
            const { data: newSupplier } = await supabase
              .from('suppliers')
              .insert({ name: product.supplier })
              .select()
              .single();
            if (newSupplier) {
              supplierId = newSupplier.id;
              supplierMap.set(supplierNameLower, newSupplier.id);
            }
          }
        }

        productsToInsert.push({
          name: product.name,
          product_id: product.product_id || `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          category_id: categoryId,
          supplier_id: supplierId,
          purchase_price: product.purchase_price || 0,
          selling_price: product.selling_price || 0,
          stock_qty: product.stock_qty || 0,
          unit: product.unit || 'pieces',
          description: product.description,
          barcode: product.barcode,
          item_code: product.item_code,
          mrp_price: product.mrp_price,
          without_tax_price: product.without_tax_price,
          packing_inner: product.packing_inner,
          packing_final_price: product.packing_final_price,
        });
      }

      const { error } = await supabase.from('products').insert(productsToInsert);

      if (error) throw error;

      toast.success(`Successfully imported ${productsToInsert.length} products`);
      setParsedData([]);
    } catch (error) {
      console.error('Error importing products:', error);
      toast.error('Failed to import products');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Smart Import</h1>
          <p className="text-muted-foreground mt-2">
            Upload CSV or PDF files from wholesalers. AI will automatically extract product information.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>
              Upload a CSV or PDF file. The system will automatically detect product names, categories, suppliers, and prices.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={!canWrite || isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Select CSV or PDF File
                </>
              )}
            </Button>

            {!canWrite && (
              <p className="text-sm text-destructive">
                You don't have permission to import data
              </p>
            )}
          </CardContent>
        </Card>

        {parsedData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Extracted Products ({parsedData.length})</CardTitle>
              <CardDescription>
                Review the extracted data before importing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-96 overflow-auto border rounded-lg">
                <table className="w-full">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2 text-sm font-medium">Name</th>
                      <th className="text-left p-2 text-sm font-medium">Category</th>
                      <th className="text-left p-2 text-sm font-medium">Supplier</th>
                      <th className="text-left p-2 text-sm font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((product, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2 text-sm">{product.name}</td>
                        <td className="p-2 text-sm">{product.category || '-'}</td>
                        <td className="p-2 text-sm">{product.supplier || '-'}</td>
                        <td className="p-2 text-sm">₹{product.selling_price || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button
                onClick={handleImport}
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  `Import ${parsedData.length} Products`
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}