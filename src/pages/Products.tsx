import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { CsvImport } from "@/components/CsvImport";
import { CsvExport } from "@/components/CsvExport";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import DOMPurify from "dompurify";

const productSchema = z.object({
  product_id: z.string().trim().min(1, "Product ID is required").max(50, "Product ID too long"),
  name: z.string().trim().min(1, "Product name is required").max(200, "Name too long"),
  category_id: z.string().uuid("Invalid category"),
  supplier_id: z.string().uuid("Invalid supplier"),
  purchase_price: z.number().min(0, "Purchase price cannot be negative").max(999999.99, "Price too high"),
  selling_price: z.number().min(0, "Selling price cannot be negative").max(999999.99, "Price too high"),
  stock_qty: z.number().int("Stock must be a whole number").min(0, "Stock cannot be negative"),
  min_stock_level: z.number().int("Min stock must be a whole number").min(0, "Min stock cannot be negative"),
  unit: z.string().trim().max(20, "Unit too long"),
  barcode: z.string().trim().max(100, "Barcode too long").default(""),
  notes: z.string().trim().max(1000, "Notes too long").default(""),
  image_url: z.string().trim().max(500, "Image URL too long").default("")
});

interface Product {
  id: string;
  product_id: string;
  name: string;
  category_id: string;
  supplier_id: string;
  purchase_price: number;
  selling_price: number;
  stock_qty: number;
  unit: string;
  barcode: string;
  min_stock_level: number;
  notes: string;
  image_url: string;
  categories: { name: string };
  suppliers: { name: string };
}

export default function Products() {
  const { canWrite, canDelete } = useUserRole();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: "",
    name: "",
    category_id: "",
    supplier_id: "",
    purchase_price: 0,
    selling_price: 0,
    stock_qty: 0,
    unit: "pieces",
    barcode: "",
    min_stock_level: 10,
    notes: "",
  });

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadSuppliers();
  }, []);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        categories (name),
        suppliers (name)
      `)
      .order("name");
    
    if (error) {
      toast.error("Error loading products");
      return;
    }
    setProducts(data || []);
  };

  const loadCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    setCategories(data || []);
  };

  const loadSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("*").order("name");
    setSuppliers(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = productSchema.safeParse(formData);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    
    const { error } = await supabase.from("products").insert([result.data as any]);
    
    if (error) {
      toast.error("Error adding product");
      return;
    }
    
    toast.success("Product added successfully!");
    setIsDialogOpen(false);
    loadProducts();
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      product_id: "",
      name: "",
      category_id: "",
      supplier_id: "",
      purchase_price: 0,
      selling_price: 0,
      stock_qty: 0,
      unit: "pieces",
      barcode: "",
      min_stock_level: 10,
      notes: "",
    });
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete products");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    
    const { error } = await supabase.from("products").delete().eq("id", id);
    
    if (error) {
      toast.error("Error deleting product");
      return;
    }
    
    toast.success("Product deleted successfully!");
    loadProducts();
  };

  const handleImport = async (data: any[]) => {
    if (!canWrite) {
      toast.error("You don't have permission to import products");
      return;
    }

    const validProducts = [];
    const errors = [];

    for (const [index, row] of data.entries()) {
      try {
        const category = categories.find(c => c.name.toLowerCase() === row.category?.toLowerCase());
        const supplier = suppliers.find(s => s.name.toLowerCase() === row.supplier?.toLowerCase());

        if (!category || !supplier) {
          errors.push(`Row ${index + 1}: Category or supplier not found`);
          continue;
        }

        const product = {
          product_id: DOMPurify.sanitize(row.product_id || row.sku || row.code),
          name: DOMPurify.sanitize(row.name || row.product_name),
          category_id: category.id,
          supplier_id: supplier.id,
          purchase_price: parseFloat(row.purchase_price || row.cost || 0),
          selling_price: parseFloat(row.selling_price || row.price || 0),
          stock_qty: parseInt(row.stock_qty || row.stock || row.quantity || 0),
          min_stock_level: parseInt(row.min_stock_level || row.min_stock || 10),
          unit: DOMPurify.sanitize(row.unit || "pieces"),
          barcode: DOMPurify.sanitize(row.barcode || ""),
          notes: DOMPurify.sanitize(row.notes || row.description || ""),
          image_url: DOMPurify.sanitize(row.image_url || "")
        };

        const result = productSchema.safeParse(product);
        if (result.success) {
          validProducts.push(result.data);
        } else {
          errors.push(`Row ${index + 1}: ${result.error.errors[0].message}`);
        }
      } catch (error) {
        errors.push(`Row ${index + 1}: Invalid data format`);
      }
    }

    if (errors.length > 0 && validProducts.length === 0) {
      toast.error(`Import failed. First error: ${errors[0]}`);
      return;
    }

    if (validProducts.length === 0) {
      toast.error("No valid products to import");
      return;
    }

    if (validProducts.length === 0) {
      toast.error("No valid products found in CSV");
      return;
    }

    const { error } = await supabase.from("products").insert(validProducts as any);
    
    if (error) {
      toast.error("Error importing products");
      return;
    }

    loadProducts();
  };

  const prepareExportData = () => {
    return products.map(p => ({
      product_id: p.product_id,
      name: p.name,
      category: p.categories?.name,
      supplier: p.suppliers?.name,
      purchase_price: p.purchase_price,
      selling_price: p.selling_price,
      stock_qty: p.stock_qty,
      min_stock_level: p.min_stock_level,
      unit: p.unit,
      barcode: p.barcode,
      notes: p.notes
    }));
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.product_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <h1 className="text-3xl font-bold">Products</h1>
          <div className="flex gap-2 flex-wrap">
            <CsvImport 
              onImport={handleImport}
              disabled={!canWrite}
              acceptedFields={["name", "category", "supplier"]}
            />
            <CsvExport 
              data={prepareExportData()} 
              filename="products"
            />
            {canWrite && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Product</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Product ID *</Label>
                        <Input
                          required
                          value={formData.product_id}
                          onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Product Name *</Label>
                        <Input
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Category</Label>
                        <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Supplier</Label>
                        <Select value={formData.supplier_id} onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select supplier" />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map((sup) => (
                              <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Purchase Price *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          required
                          value={formData.purchase_price}
                          onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label>Selling Price *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          required
                          value={formData.selling_price}
                          onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label>Stock Quantity *</Label>
                        <Input
                          type="number"
                          required
                          value={formData.stock_qty}
                          onChange={(e) => setFormData({ ...formData, stock_qty: parseInt(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label>Unit</Label>
                        <Input
                          value={formData.unit}
                          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Barcode</Label>
                        <Input
                          value={formData.barcode}
                          onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Min Stock Level</Label>
                        <Input
                          type="number"
                          value={formData.min_stock_level}
                          onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>
                    <Button type="submit" className="w-full">Add Product</Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="bg-card rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold">Product ID</th>
                  <th className="text-left p-4 font-semibold">Name</th>
                  <th className="text-left p-4 font-semibold">Category</th>
                  <th className="text-left p-4 font-semibold">Stock</th>
                  <th className="text-left p-4 font-semibold">Purchase Price</th>
                  <th className="text-left p-4 font-semibold">Selling Price</th>
                  <th className="text-left p-4 font-semibold">Supplier</th>
                  {(canWrite || canDelete) && <th className="text-left p-4 font-semibold">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-t hover:bg-muted/30">
                    <td className="p-4">{product.product_id}</td>
                    <td className="p-4 font-medium">{product.name}</td>
                    <td className="p-4">{product.categories?.name || "-"}</td>
                    <td className="p-4">
                      <span className={product.stock_qty < product.min_stock_level ? "text-warning font-semibold" : ""}>
                        {product.stock_qty} {product.unit}
                      </span>
                    </td>
                    <td className="p-4">₹{product.purchase_price.toFixed(2)}</td>
                    <td className="p-4">₹{product.selling_price.toFixed(2)}</td>
                    <td className="p-4">{product.suppliers?.name || "-"}</td>
                    {(canWrite || canDelete) && (
                      <td className="p-4">
                        <div className="flex gap-2">
                          {canWrite && (
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDelete(product.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
