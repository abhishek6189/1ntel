import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

const Footer = () => (
  <footer className="border-t bg-card py-12 mt-20">
    <div className="container">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <Link to="/" className="flex items-center gap-2 font-heading text-lg font-bold mb-3">
            <Shield className="h-5 w-5 text-primary" />
            VerifyCar
          </Link>
          <p className="text-sm text-muted-foreground">Canada's trusted verified car marketplace. Buy and sell with confidence.</p>
        </div>
        <div>
          <h4 className="font-heading font-semibold mb-3 text-sm">Marketplace</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/browse" className="hover:text-foreground transition-colors">Browse Cars</Link></li>
            <li><Link to="/sell" className="hover:text-foreground transition-colors">Sell Your Car</Link></li>
            <li><Link to="/pricing" className="hover:text-foreground transition-colors">Dealer Plans</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading font-semibold mb-3 text-sm">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
            <li><Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading font-semibold mb-3 text-sm">Legal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
            <li><Link to="/refund" className="hover:text-foreground transition-colors">Refund Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t mt-8 pt-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} VerifyCar. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
