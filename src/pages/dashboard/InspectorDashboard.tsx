import Breadcrumbs from "@/components/Breadcrumbs";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, MapPin, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

const assignments = [
  { id: '1', car: '2021 Toyota RAV4 LE AWD', location: 'Vancouver, BC', date: '2024-03-16', status: 'assigned' },
  { id: '2', car: '2023 BMW X5 xDrive40i', location: 'Montreal, QC', date: '2024-03-18', status: 'assigned' },
  { id: '3', car: '2019 Mazda CX-5 GT', location: 'Ottawa, ON', date: '2024-03-10', status: 'submitted' },
];

const InspectorDashboard = () => (
  <div className="min-h-screen">
    <Navbar />
    <div className="container py-8">
      <Breadcrumbs/>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="font-heading text-3xl font-bold mb-1">Inspector Dashboard</h1>
        <p className="text-muted-foreground mb-8">View and complete your assigned vehicle inspections.</p>

        <div className="space-y-4">
          {assignments.map((a) => (
            <div key={a.id} className="glass rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="font-heading font-semibold">{a.car}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {a.location}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {a.date}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={a.status === 'submitted' ? 'default' : 'secondary'}>{a.status}</Badge>
                {a.status === 'assigned' && (
                  <Button size="sm">
                    <ClipboardCheck className="h-4 w-4 mr-1.5" /> Submit Report
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
    <Footer />
  </div>
);

export default InspectorDashboard;
