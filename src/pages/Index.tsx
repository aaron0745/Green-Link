import { Link } from "react-router-dom";
import { Leaf, Recycle, BarChart3, Shield, Truck, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const benefits = [
  { icon: Shield, title: "Transparency", desc: "Every collection is digitally logged with timestamps and GPS verification." },
  { icon: BarChart3, title: "Efficiency", desc: "Real-time dashboards replace manual logbooks, saving hours of administrative work." },
  { icon: Recycle, title: "Sustainability", desc: "Promote responsible disposal and ensure 100% coverage across wards." },
];

const problems = [
  "Manual logbooks are error-prone and easily manipulated",
  "No real-time visibility into collection coverage",
  "Revenue leakage due to unverified collections",
  "Inefficient route tracking and ward monitoring",
  "Paper receipts are easily lost or forged",
];

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.1 } },
  viewport: { once: true }
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5" />
        <nav className="relative z-10 container mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Leaf className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <p className="font-bold text-foreground leading-tight"><span className="text-green-600">Green</span>-link</p>
              <p className="text-xs text-muted-foreground">Smart Waste Management</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link to="/login">
              <Button size="sm">Login</Button>
            </Link>
          </motion.div>
        </nav>

        <div className="relative z-10 container mx-auto px-6 py-20 text-center max-w-3xl">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6"
          >
            <Recycle className="h-4 w-4" />
            Digital Transformation for Kerala Panchayats
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-foreground mb-5 leading-tight"
          >
            Smart Waste Management System
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto"
          >
            Replace manual logbooks and paper receipts with a QR-based digital workflow.
            Empowering Panchayats with transparency, efficiency, and accountability.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link to="/login">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                Access Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                <Truck className="h-4 w-4" /> Collector Interface
              </Button>
            </Link>
          </motion.div>
        </div>
      </header>

      {/* Problem Section */}
      <section className="py-16 bg-card border-y border-border">
        <div className="container mx-auto px-6 max-w-4xl">
          <motion.div {...fadeInUp} className="text-center mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-2">The Problem with Manual Systems</h2>
            <p className="text-muted-foreground">Current paper-based workflows are failing Kerala's waste management goals.</p>
          </motion.div>
          
          <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto"
          >
            {problems.map((p, i) => (
              <motion.div 
                key={i} 
                variants={fadeInUp}
                className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/10"
              >
                <span className="text-destructive font-bold text-sm mt-0.5">✕</span>
                <p className="text-sm text-foreground">{p}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Solution */}
      <section className="py-24">
        <div className="container mx-auto px-6 max-w-5xl text-center">
          <motion.div {...fadeInUp} className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">The Digital Solution</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">A complete QR-based workflow that digitizes every step of the waste collection process.</p>
          </motion.div>

          <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              { step: "1", title: "QR Code Scan", desc: "Collector scans household QR at each doorstep to verify the visit." },
              { step: "2", title: "Auto-Log Data", desc: "Timestamp, GPS location, and payment are logged automatically." },
              { step: "3", title: "Digital Receipt", desc: "Resident gets a verified digital receipt. Admin sees it live." },
            ].map((s) => (
              <motion.div key={s.step} variants={fadeInUp}>
                <Card className="text-left h-full hover:shadow-lg transition-shadow border-primary/10">
                  <CardContent className="pt-8">
                    <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-base mb-4 shadow-lg shadow-primary/20">
                      {s.step}
                    </div>
                    <h3 className="font-bold text-xl text-foreground mb-2">{s.title}</h3>
                    <p className="text-muted-foreground">{s.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 bg-primary/5 border-y border-primary/10">
        <div className="container mx-auto px-6 max-w-4xl">
          <motion.h2 {...fadeInUp} className="text-3xl font-bold text-foreground mb-12 text-center">Key Benefits</motion.h2>
          <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            {benefits.map((b) => (
              <motion.div 
                key={b.title} 
                variants={fadeInUp}
                className="flex flex-col items-center text-center p-6 bg-background rounded-2xl border border-border shadow-sm"
              >
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <b.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-bold text-lg text-foreground mb-3">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-24">
        <div className="container mx-auto px-6 max-w-2xl">
          <motion.h2 {...fadeInUp} className="text-2xl font-bold text-foreground mb-8 text-center">Why Go Digital?</motion.h2>
          <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className="space-y-4"
          >
            {[
              "Eliminates manual errors and manipulation",
              "Prevents revenue leakage with verified logs",
              "Real-time monitoring for administrators",
              "Improves collector accountability",
              "Enables data-driven local governance",
            ].map((b, i) => (
              <motion.div 
                key={i} 
                variants={fadeInUp}
                className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
              >
                <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <p className="font-medium text-foreground">{b}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-card">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Leaf className="h-5 w-5 text-green-600" />
            <span className="font-bold text-foreground">Green-link</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 Green-link — Smart Waste Management System | Digital Initiative
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
