import { Building2, Mail, MapPin, Phone } from "lucide-react";
import idealLogo from "@/assets/ideal-electricals-logo-v2.png";

export const BusinessHeader = () => {
  return (
    <div className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground p-6 rounded-lg shadow-lg mb-6">
      <div className="flex items-center gap-4 mb-4">
        <img 
          src={idealLogo} 
          alt="IDEAL ELECTRICALS Logo" 
          className="w-16 h-16 rounded-lg bg-white/10 p-1"
        />
        <div>
          <h1 className="text-3xl font-bold">IDEAL ELECTRICALS</h1>
          <p className="text-sm opacity-90">Govt. Regd. Contractor</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
        <div className="flex items-start gap-2">
          <Building2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">M.C. No.</p>
            <p className="opacity-90">3203100145090122024</p>
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <Building2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Vendor No.</p>
            <p className="opacity-90">100037533</p>
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <Building2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">GST No.</p>
            <p className="opacity-90">27DGQPM5400R1ZN</p>
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Mobile</p>
            <p className="opacity-90">+91 9028165082</p>
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Email</p>
            <p className="opacity-90">iqbaljamsheed143@gmail.com</p>
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Location</p>
            <p className="opacity-90">Tarasingh Market, Vazirabad, Nanded – 431601</p>
          </div>
        </div>
      </div>
    </div>
  );
};
