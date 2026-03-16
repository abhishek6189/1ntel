import Breadcrumbs from "@/components/Breadcrumbs";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Car, ClipboardCheck, MessageSquare, BarChart3, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

const stats = [
  { label: 'Total Users', value: '1,247', icon: Users },
  { label: 'Active Listings', value: '342', icon: Car },
  { label: 'Pending Inspections', value: '18', icon: ClipboardCheck },
  { label: 'Open Chats', value: '7', icon: MessageSquare },
];

const AdminDashboard = () => (
  <div className="min-h-screen">
    <Navbar />
    <div className="container py-8">
      <Breadcrumbs/>  
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="font-heading text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Platform management and moderation.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="glass rounded-xl p-5">
              <s.icon className="h-5 w-5 text-muted-foreground mb-2" />
              <p className="text-2xl font-heading font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="inspections">
          <TabsList>
            <TabsTrigger value="inspections"><ClipboardCheck className="h-4 w-4 mr-1.5" /> Inspections</TabsTrigger>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-1.5" /> Users</TabsTrigger>
            <TabsTrigger value="listings"><Car className="h-4 w-4 mr-1.5" /> Listings</TabsTrigger>
            <TabsTrigger value="chat"><MessageSquare className="h-4 w-4 mr-1.5" /> Chat Moderation</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1.5" /> Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="inspections" className="mt-6 space-y-4">
            {[
              { car: '2021 Toyota RAV4', buyer: 'Alex P.', status: 'pending_assignment', date: '2024-03-14' },
              { car: '2023 BMW X5', buyer: 'Priya S.', status: 'in_progress', date: '2024-03-13' },
              { car: '2019 Mazda CX-5', buyer: 'Marc L.', status: 'completed', date: '2024-03-10' },
            ].map((insp, i) => (
              <div key={i} className="glass rounded-xl p-5 flex items-center justify-between">
                <div>
                  <p className="font-heading font-semibold">{insp.car}</p>
                  <p className="text-sm text-muted-foreground">Buyer: {insp.buyer} • {insp.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={insp.status === 'completed' ? 'default' : 'secondary'}>{insp.status.replace('_', ' ')}</Badge>
                  {insp.status === 'pending_assignment' && <Button size="sm">Assign Inspector</Button>}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>User management will be connected to Lovable Cloud.</p>
            </div>
          </TabsContent>

          <TabsContent value="listings" className="mt-6">
            <div className="text-center py-12 text-muted-foreground">
              <Car className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Listing approval and management.</p>
            </div>
          </TabsContent>

          <TabsContent value="chat" className="mt-6">
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Moderated buyer-seller conversations will appear here.</p>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Platform analytics and reporting.</p>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
    <Footer />
  </div>
);

export default AdminDashboard;
