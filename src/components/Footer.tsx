import { Link } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";

const Footer = () => (
  <footer className="mt-12 border-t bg-card py-10 sm:mt-20 sm:py-12">
    <div className="container">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link to="/" className="mb-3 inline-flex items-center">
            <BrandLogo className="text-4xl sm:text-5xl" />
          </Link>
          <p className="max-w-xs text-sm leading-6 text-muted-foreground">
            Canada's trusted verified car marketplace. Buy and sell with confidence.
          </p>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">Marketplace</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/browse" className="transition-colors hover:text-foreground">
                Browse Cars
              </Link>
            </li>
            <li>
              <Link to="/pricing" className="transition-colors hover:text-foreground">
                Dealer Plans
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/about" className="transition-colors hover:text-foreground">
                About Us
              </Link>
            </li>
            <li>
              <Link to="/contact" className="transition-colors hover:text-foreground">
                Contact
              </Link>
            </li>
            <li>
              <Link to="/faq" className="transition-colors hover:text-foreground">
                FAQ
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">Legal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/privacy" className="transition-colors hover:text-foreground">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="transition-colors hover:text-foreground">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link to="/refund" className="transition-colors hover:text-foreground">
                Refund Policy
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} 1ntel. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
