import { useEffect, useState } from "react";
import { BusinessHeader } from "@/components/BusinessHeader";
import { MetricCard } from "@/components/MetricCard";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Package, AlertTriangle, DollarSign, Users, Plus, Package2, FileText, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    lowStockItems: 0,
    totalStockValue: 0,
    totalSuppliers: 0
  });

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    // Get total products
    const { count: productsCount } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });

    // Get low stock items
    const { data: products } = await supabase
      .from("products")
      .select("stock_qty, min_stock_level, purchase_price");

    const lowStock = products?.filter(p => p.stock_qty < p.min_stock_level).length || 0;
    
    // Calculate total stock value
    const totalValue = products?.reduce((sum, p) => sum + (p.stock_qty * p.purchase_price), 0) || 0;

    // Get total suppliers
    const { count: suppliersCount } = await supabase
      .from("suppliers")
      .select("*", { count: "exact", head: true });

    setMetrics({
      totalProducts: productsCount || 0,
      lowStockItems: lowStock,
      totalStockValue: totalValue,
      totalSuppliers: suppliersCount || 0
    });
  };

  return (
    <Layout>
      <BusinessHeader />
      
      <div className="space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Products"
            value={metrics.totalProducts}
            icon={Package}
            variant="default"
          />
          <MetricCard
            title="Low Stock Items"
            value={metrics.lowStockItems}
            icon={AlertTriangle}
            variant="warning"
          />
          <MetricCard
            title="Total Stock Value"
            value={`₹${metrics.totalStockValue.toFixed(2)}`}
            icon={DollarSign}
            variant="success"
          />
          <MetricCard
            title="Total Suppliers"
            value={metrics.totalSuppliers}
            icon={Users}
            variant="default"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-card p-6 rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button onClick={() => navigate("/products")} className="h-auto flex-col gap-2 p-6">
              <Plus className="w-6 h-6" />
              Add Product
            </Button>
            <Button onClick={() => navigate("/stock-movements")} variant="secondary" className="h-auto flex-col gap-2 p-6">
              <Package2 className="w-6 h-6" />
              Add Stock
            </Button>
            <Button onClick={() => navigate("/requirements")} variant="secondary" className="h-auto flex-col gap-2 p-6">
              <FileText className="w-6 h-6" />
              View Requirements
            </Button>
            <Button onClick={() => navigate("/suppliers")} variant="secondary" className="h-auto flex-col gap-2 p-6">
              <UserPlus className="w-6 h-6" />
              Add Supplier
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
