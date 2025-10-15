import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Package, AlertTriangle, FolderOpen, TrendingUp } from "lucide-react";

export default function Reports() {
  const [stats, setStats] = useState({
    totalValue: 0,
    lowStockCount: 0,
    categoryBreakdown: [] as any[],
    topProducts: [] as any[],
  });

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    // Get all products with related data
    const { data: products } = await supabase
      .from("products")
      .select(`
        *,
        categories (name),
        suppliers (name)
      `);

    if (!products) return;

    // Calculate total stock value
    const totalValue = products.reduce((sum, p) => sum + (p.stock_qty * p.purchase_price), 0);

    // Count low stock items
    const lowStockCount = products.filter(p => p.stock_qty < p.min_stock_level).length;

    // Category breakdown
    const categoryMap = new Map();
    products.forEach(p => {
      const catName = p.categories?.name || "Uncategorized";
      const current = categoryMap.get(catName) || { name: catName, count: 0, value: 0 };
      current.count += 1;
      current.value += p.stock_qty * p.purchase_price;
      categoryMap.set(catName, current);
    });
    const categoryBreakdown = Array.from(categoryMap.values()).sort((a, b) => b.value - a.value);

    // Top products by stock value
    const topProducts = products
      .map(p => ({
        name: p.name,
        product_id: p.product_id,
        value: p.stock_qty * p.purchase_price,
        stock_qty: p.stock_qty,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    setStats({
      totalValue,
      lowStockCount,
      categoryBreakdown,
      topProducts,
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Total Stock Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">₹{stats.totalValue.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-2">Current inventory valuation</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Low Stock Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats.lowStockCount}</p>
              <p className="text-sm text-muted-foreground mt-2">Products below minimum level</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-primary" />
                Stock by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.categoryBreakdown.slice(0, 8).map((cat, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{cat.name}</p>
                      <p className="text-xs text-muted-foreground">{cat.count} products</p>
                    </div>
                    <p className="font-semibold">₹{cat.value.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-success" />
                Top Products by Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topProducts.map((prod, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{prod.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {prod.product_id} • {prod.stock_qty} units
                      </p>
                    </div>
                    <p className="font-semibold">₹{prod.value.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
