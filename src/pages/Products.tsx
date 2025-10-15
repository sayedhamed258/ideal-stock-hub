import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

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
    
    const { error } = await supabase.from("products").insert([formData]);
    
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

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.product_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Products</h1>
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
