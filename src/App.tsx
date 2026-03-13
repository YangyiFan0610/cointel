import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Globe, 
  Server, 
  Database, 
  BrainCircuit, 
  CreditCard, 
  Search, 
  Bell, 
  User,
  ArrowUpRight,
  Plus,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';

const SERVICES = [
  {
    id: 'domain',
    name: 'Domain Names',
    icon: Globe,
    description: 'Register your brand identity with premium TLDs.',
    price: 'From $9.99/yr',
    status: 'Available',
    color: 'text-blue-600',
    bg: 'bg-blue-50'
  },
  {
    id: 'hosting',
    name: 'Cloud Hosting',
    icon: Server,
    description: 'High-performance edge hosting for your web apps.',
    price: 'From $5.00/mo',
    status: 'Active',
    color: 'text-purple-600',
    bg: 'bg-purple-50'
  },
  {
    id: 'database',
    name: 'Managed DB',
    icon: Database,
    description: 'Scalable SQL & NoSQL databases with auto-backup.',
    price: 'From $12.00/mo',
    status: 'Provisioned',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50'
  },
  {
    id: 'ai',
    name: 'AI APIs',
    icon: BrainCircuit,
    description: 'Access Gemini, GPT-4, and Claude via unified API.',
    price: 'Pay as you go',
    status: 'Ready',
    color: 'text-amber-600',
    bg: 'bg-amber-50'
  }
];

const RECENT_ACTIVITY = [
  { id: 1, action: 'Domain registered', target: 'startup-alpha.com', time: '2h ago' },
  { id: 2, action: 'Database backup', target: 'prod-db-01', time: '5h ago' },
  { id: 3, action: 'API Key generated', target: 'Gemini Pro', time: '1d ago' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-slate-900 font-sans flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden lg:flex">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Zap className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">Cointel</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'services', icon: Globe, label: 'Services' },
            { id: 'billing', icon: CreditCard, label: 'Billing' },
            { id: 'settings', icon: User, label: 'Account' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === item.id 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-slate-900 rounded-2xl p-4 text-white">
            <p className="text-xs font-medium text-slate-400 mb-1">Current Plan</p>
            <p className="text-sm font-bold mb-3">Startup Pro</p>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mb-4">
              <div className="bg-indigo-500 h-full w-3/4 rounded-full" />
            </div>
            <button className="w-full py-2 bg-white text-slate-900 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors">
              Upgrade
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search services, domains..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 rounded-xl text-sm transition-all outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 overflow-hidden">
              <img src="https://picsum.photos/seed/user/100/100" alt="Avatar" referrerPolicy="no-referrer" />
            </div>
          </div>
        </header>

        {/* Dashboard View */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Welcome back, Founder</h1>
                <p className="text-slate-500 text-sm">Here is what is happening with your startup today.</p>
              </div>
              <button className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20">
                <Plus size={18} />
                New Project
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { label: 'Total Spend', value: '$124.50', change: '+12%', icon: CreditCard, color: 'text-blue-600' },
                { label: 'Active Services', value: '12', change: '0', icon: Server, color: 'text-purple-600' },
                { label: 'Uptime', value: '99.98%', change: '+0.01%', icon: ShieldCheck, color: 'text-emerald-600' },
                { label: 'API Requests', value: '45.2k', change: '+24%', icon: BrainCircuit, color: 'text-amber-600' },
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2 rounded-lg bg-slate-50 ${stat.color}`}>
                      <stat.icon size={20} />
                    </div>
                    <span className={`text-xs font-bold ${stat.change.startsWith('+') ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {stat.change}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Services */}
              <div className="lg:col-span-2 space-y-6">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  Essential Services
                  <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">4 Available</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {SERVICES.map((service, i) => (
                    <motion.div 
                      key={service.id}
                      whileHover={{ y: -4 }}
                      className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl ${service.bg} ${service.color}`}>
                          <service.icon size={24} />
                        </div>
                        <div className="bg-slate-50 text-slate-400 p-1.5 rounded-lg group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                          <ArrowUpRight size={16} />
                        </div>
                      </div>
                      <h3 className="font-bold text-slate-900 mb-1">{service.name}</h3>
                      <p className="text-slate-500 text-xs leading-relaxed mb-4">{service.description}</p>
                      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <span className="text-sm font-bold text-slate-900">{service.price}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">{service.status}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-8">
                {/* Activity */}
                <section>
                  <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Activity</h2>
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {RECENT_ACTIVITY.map((item, i) => (
                      <div key={item.id} className={`p-4 flex items-center justify-between ${i !== RECENT_ACTIVITY.length - 1 ? 'border-b border-slate-100' : ''}`}>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{item.action}</p>
                          <p className="text-xs text-slate-500">{item.target}</p>
                        </div>
                        <span className="text-[10px] font-medium text-slate-400">{item.time}</span>
                      </div>
                    ))}
                    <button className="w-full py-3 text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1">
                      View All <ChevronRight size={14} />
                    </button>
                  </div>
                </section>

                {/* Quick Links */}
                <section>
                  <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Links</h2>
                  <div className="space-y-3">
                    {[
                      { label: 'API Documentation', icon: ExternalLink },
                      { label: 'Community Support', icon: ExternalLink },
                      { label: 'System Status', icon: ShieldCheck },
                    ].map((link, i) => (
                      <button key={i} className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition-all group">
                        <span className="text-sm font-medium text-slate-600 group-hover:text-indigo-600">{link.label}</span>
                        <link.icon size={14} className="text-slate-400 group-hover:text-indigo-600" />
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
