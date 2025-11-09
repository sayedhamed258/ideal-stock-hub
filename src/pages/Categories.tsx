import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { CsvImport } from "@/components/CsvImport";
import { CsvExport } from "@/components/CsvExport";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(100, "Name too long"),
  description: z.string().trim().max(500, "Description too long").default("")
});

interface Category {
  id: string;
  name: string;
  description: string;
}

export default function Categories() {
  const { canWrite, canDelete } = useUserRole();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    
    if (error) {
      toast.error("Error loading categories");
      return;
    }
    setCategories(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = categorySchema.safeParse(formData);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    
    const { error } = await supabase.from("categories").insert([result.data as any]);
    
    if (error) {
      toast.error("Error adding category");
      return;
    }
    
    toast.success("Category added successfully!");
    setIsDialogOpen(false);
    loadCategories();
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
    });
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete categories");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    
    const { error } = await supabase.from("categories").delete().eq("id", id);
    
    if (error) {
      toast.error("Error deleting category");
      return;
    }
    
    toast.success("Category deleted successfully!");
    loadCategories();
  };

  const handleImport = async (data: any[]) => {
    if (!canWrite) {
      toast.error("You don't have permission to import categories");
      return;
    }

    const validCategories = data.map(row => ({
      name: row.name || row.category_name,
      description: row.description || ""
    })).filter(cat => cat.name);

    if (validCategories.length === 0) {
      toast.error("No valid categories found in CSV");
      return;
    }

    const { error } = await supabase.from("categories").insert(validCategories as any);
    
    if (error) {
      toast.error("Error importing categories");
      return;
    }

    loadCategories();
  };

  const prepareExportData = () => {
    return categories.map(c => ({
      name: c.name,
      description: c.description
    }));
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <h1 className="text-3xl font-bold">Categories</h1>
          <div className="flex gap-2 flex-wrap">
            <CsvImport 
              onImport={handleImport} 
              disabled={!canWrite}
              acceptedFields={["name"]}
            />
            <CsvExport 
              data={prepareExportData()} 
              filename="categories"
            />
            {canWrite && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Category
                  </Button>
                </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Category Name *</Label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">Add Category</Button>
              </form>
            </DialogContent>
          </Dialog>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div key={category.id} className="bg-card p-6 rounded-lg border hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-lg mb-2">{category.name}</h3>
              <p className="text-sm text-muted-foreground">{category.description || "No description"}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
