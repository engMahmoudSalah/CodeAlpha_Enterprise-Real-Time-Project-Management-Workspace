import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { soundManager } from '../utils/soundEffects';
import { Avatar } from '../designSystem';
import {
  ArrowRight,
  CheckCircle2,
  Users,
  Shield,
  Bell,
  Volume2,
  Lock,
  Globe,
  Layers,
  Activity,
  ChevronRight,
  Check,
  Play,
  KeyRound,
  LogIn,
  MessageSquare,
  Clock,
  ArrowUpRight,
  FolderPlus,
  ChevronDown,
  ExternalLink,
  Laptop,
  CheckSquare,
  SlidersHorizontal,
  Mail,
  HelpCircle,
  BarChart3,
  Cpu,
  RefreshCw,
  Share2,
} from 'lucide-react';

interface LandingPageProps {
  onEnterWorkspace: () => void;
  onOpenAuthModal: () => void;
  projectsCount?: number;
  tasksCount?: number;
  usersCount?: number;
}

interface DemoTask {
  id: string;
  title: string;
  column: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeName: string;
  assigneeAvatar: string;
  commentsCount: number;
}

const INITIAL_DEMO_TASKS: DemoTask[] = [
  {
    id: 'demo-1',
    title: 'Finalize quarterly performance review guidelines',
    column: 'done',
    priority: 'high',
    assigneeName: 'Alex Morgan',
    assigneeAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    commentsCount: 4,
  },
  {
    id: 'demo-2',
    title: 'Audit system access logs and update security protocol',
    column: 'in_progress',
    priority: 'urgent',
    assigneeName: 'Sarah Jenkins',
    assigneeAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    commentsCount: 7,
  },
  {
    id: 'demo-3',
    title: 'Publish annual corporate sustainability report',
    column: 'in_progress',
    priority: 'medium',
    assigneeName: 'Omar Khaled',
    assigneeAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Omar',
    commentsCount: 2,
  },
  {
    id: 'demo-4',
    title: 'Schedule compliance training for new administrative staff',
    column: 'todo',
    priority: 'medium',
    assigneeName: 'David Chen',
    assigneeAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    commentsCount: 1,
  },
];

const FAQS = [
  {
    question: 'How is data synchronized across the enterprise?',
    answer:
      'Velocity leverages an advanced real-time synchronization architecture. Changes to tasks, documents, or project statuses are instantly propagated to all authenticated clients within milliseconds, ensuring data consistency without manual intervention.',
  },
  {
    question: 'How are access privileges managed?',
    answer:
      'Administrators can manage permissions via a stringent Role-Based Access Control (RBAC) framework. Access tokens and direct email invitations dictate user roles, restricting sensitive operations exclusively to authorized personnel.',
  },
  {
    question: 'What auditing and tracking capabilities are available?',
    answer:
      'Every operation within the workspace is logged in a centralized audit trail. This enables management to review historical changes, track task progression, and maintain compliance with internal operational standards.',
  },
  {
    question: 'Is the platform accessible on mobile devices?',
    answer:
      'Yes, the platform is designed with a responsive architecture that adapts to various screen dimensions, ensuring operational continuity for management and staff from any location.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterWorkspace,
  onOpenAuthModal,
  projectsCount = 3,
  tasksCount = 12,
  usersCount = 6,
}) => {
  const { currentUser } = useAuth();
  const { isConnected: wsConnected } = useWebSocket();

  const [demoTasks, setDemoTasks] = useState<DemoTask[]>(INITIAL_DEMO_TASKS);
  const [demoFilter, setDemoFilter] = useState<'all' | 'high' | 'urgent'>('all');
  const [activeFeatureTab, setActiveFeatureTab] = useState<'kanban' | 'collab' | 'sound' | 'security'>('kanban');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isScrolled, setIsScrolled] = useState(false);

  // Monitor scroll position to toggle navbar transparent background before movement
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const filteredDemoTasks = useMemo(() => {
    if (demoFilter === 'all') return demoTasks;
    return demoTasks.filter((t) => t.priority === demoFilter);
  }, [demoTasks, demoFilter]);

  const handleMoveDemoTask = (taskId: string, nextCol: 'todo' | 'in_progress' | 'done') => {
    setDemoTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          if (nextCol === 'done') {
            soundManager.playSuccessPop();
          } else {
            soundManager.playNotificationChime();
          }
          return { ...t, column: nextCol };
        }
        return t;
      })
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans flex flex-col relative overflow-x-hidden selection:bg-blue-200 selection:text-blue-900">
      
      {/* FIXED TOP NAV BAR */}
      <header
        id="landing-navbar"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md border-b border-zinc-200/90 shadow-xs'
            : 'bg-transparent border-b border-transparent shadow-none'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-900 flex items-center justify-center rounded-sm shadow-xs">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold tracking-tight text-zinc-900">
                Velocity
              </span>
              <span className={`hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 border rounded-sm text-[10px] font-medium uppercase tracking-wider transition-colors ${
                isScrolled
                  ? 'border-zinc-200 bg-zinc-50 text-zinc-600'
                  : 'border-zinc-300/60 bg-white/70 backdrop-blur-xs text-zinc-700 shadow-2xs'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                System Active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a href="#features" className="hidden md:block text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Capabilities</a>
            <a href="#architecture" className="hidden md:block text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Infrastructure</a>
            <a href="#faq" className="hidden md:block text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">FAQ</a>
            
            <div className="h-4 w-px bg-zinc-200 hidden md:block mx-2" />

            {currentUser ? (
              <button
                onClick={onEnterWorkspace}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-sm transition-colors shadow-xs cursor-pointer"
              >
                Enter Workspace
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={onOpenAuthModal}
                  className="text-sm font-medium text-zinc-700 hover:text-zinc-900 transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={onOpenAuthModal}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-sm transition-colors shadow-xs cursor-pointer"
                >
                  Request Access
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-28 pb-32 sm:pt-32 lg:pt-36 lg:pb-40 px-4 overflow-hidden border-b border-zinc-200 bg-white">
        {/* Subtle grid pattern background for official feel */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiNlN2U1ZTQiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10 grid lg:grid-cols-2 gap-16 lg:gap-8 items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 border border-zinc-200 rounded-sm text-xs font-semibold text-zinc-700 uppercase tracking-widest mb-8">
              <Shield className="w-3.5 h-3.5" />
              Enterprise Project Management
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-zinc-900 tracking-tight leading-[1.1] mb-6">
              Official Workflow <br/>
              <span className="text-blue-700">Synchronization.</span>
            </h1>
            <p className="text-lg text-zinc-600 leading-relaxed mb-10 max-w-xl">
              A highly structured, real-time administrative platform engineered for stringent operational tracking, verifiable team collaboration, and instantaneous state propagation.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={currentUser ? onEnterWorkspace : onOpenAuthModal}
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-sm transition-colors shadow-sm"
              >
                {currentUser ? 'Access Control Panel' : 'Authenticate & Enter'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
              <a
                href="#features"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-sm transition-colors"
              >
                Review Capabilities
              </a>
            </div>

            <div className="mt-12 flex items-center gap-8 border-t border-zinc-200 pt-8">
              <div>
                <p className="text-3xl font-semibold text-zinc-900 tracking-tight">{projectsCount}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Active Projects</p>
              </div>
              <div className="w-px h-10 bg-zinc-200" />
              <div>
                <p className="text-3xl font-semibold text-zinc-900 tracking-tight">{tasksCount}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Managed Tasks</p>
              </div>
              <div className="w-px h-10 bg-zinc-200" />
              <div>
                <p className="text-3xl font-semibold text-zinc-900 tracking-tight">{usersCount}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Personnel</p>
              </div>
            </div>
          </div>

          {/* Interactive Sandbox UI */}
          <div className="relative">
            <div className="absolute -inset-4 bg-zinc-100 border border-zinc-200 rounded-sm transform rotate-1 pointer-events-none" />
            <div className="bg-white border border-zinc-300 shadow-sm rounded-sm p-6 relative transform -rotate-1 transition-transform hover:rotate-0 duration-500">
              <div className="flex items-center justify-between mb-6 border-b border-zinc-100 pb-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">Task Overview</h3>
                  <p className="text-xs text-zinc-500 mt-1">Live interactive demonstration</p>
                </div>
                <div className="flex bg-zinc-100 p-1 rounded-sm border border-zinc-200">
                  <button
                    onClick={() => setDemoFilter('all')}
                    className={`px-3 py-1 text-xs font-medium rounded-sm ${demoFilter === 'all' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-600 hover:text-zinc-900'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setDemoFilter('urgent')}
                    className={`px-3 py-1 text-xs font-medium rounded-sm ${demoFilter === 'urgent' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-600 hover:text-zinc-900'}`}
                  >
                    Urgent
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {filteredDemoTasks.map(task => (
                  <div key={task.id} className="p-4 border border-zinc-200 rounded-sm bg-white hover:border-blue-400 transition-colors group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 border rounded-sm ${
                            task.priority === 'urgent' ? 'bg-red-50 text-red-700 border-red-200' :
                            task.priority === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {task.priority}
                          </span>
                          <span className="text-xs text-zinc-400 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {task.commentsCount}
                          </span>
                        </div>
                        <h4 className="text-sm font-medium text-zinc-900 leading-snug">{task.title}</h4>
                        <div className="flex items-center gap-2 mt-3">
                          <img src={task.assigneeAvatar} alt="" className="w-5 h-5 rounded-sm border border-zinc-300 bg-zinc-100" />
                          <span className="text-xs text-zinc-600">{task.assigneeName}</span>
                        </div>
                      </div>

                      {/* Interactive Column Mover */}
                      <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {task.column !== 'todo' && (
                          <button
                            onClick={() => handleMoveDemoTask(task.id, 'todo')}
                            className="text-[10px] font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded-sm border border-zinc-200 text-center"
                          >
                            To Do
                          </button>
                        )}
                        {task.column !== 'in_progress' && (
                          <button
                            onClick={() => handleMoveDemoTask(task.id, 'in_progress')}
                            className="text-[10px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-sm border border-blue-200 text-center"
                          >
                            Active
                          </button>
                        )}
                        {task.column !== 'done' && (
                          <button
                            onClick={() => handleMoveDemoTask(task.id, 'done')}
                            className="text-[10px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-sm border border-emerald-200 text-center"
                          >
                            Done
                          </button>
                        )}
                      </div>
                      
                      {/* Status Indicator */}
                      <div className="absolute top-4 right-4 group-hover:hidden">
                        {task.column === 'done' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : task.column === 'in_progress' ? (
                          <Clock className="w-5 h-5 text-blue-500" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-zinc-300 rounded-sm" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">Test the system by interacting above</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CORE CAPABILITIES SECTION */}
      <section id="features" className="py-24 bg-zinc-50 border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-sm font-bold text-blue-700 tracking-widest uppercase mb-3">System Capabilities</h2>
            <h3 className="text-3xl font-semibold text-zinc-900 mb-6">Structured Administrative Oversight</h3>
            <p className="text-zinc-600 text-lg">
              Velocity implements enterprise-grade standards for visibility, accountability, and organizational tracking.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 border border-zinc-200 rounded-sm shadow-sm">
              <div className="w-12 h-12 bg-zinc-100 border border-zinc-200 rounded-sm flex items-center justify-center mb-6">
                <LayoutGrid className="w-6 h-6 text-zinc-700" />
              </div>
              <h4 className="text-lg font-semibold text-zinc-900 mb-3">Structured Workflows</h4>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Utilize Kanban boards and detailed list views to maintain precise control over operational pipelines. Every task enforces status, priority, and assignees.
              </p>
            </div>
            
            <div className="bg-white p-8 border border-zinc-200 rounded-sm shadow-sm">
              <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-sm flex items-center justify-center mb-6">
                <RefreshCw className="w-6 h-6 text-blue-700" />
              </div>
              <h4 className="text-lg font-semibold text-zinc-900 mb-3">Real-Time State Propagation</h4>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Modifications are instantaneously synchronized across the network. Eliminate redundant reporting and ensure all personnel operate on the latest dataset.
              </p>
            </div>

            <div className="bg-white p-8 border border-zinc-200 rounded-sm shadow-sm">
              <div className="w-12 h-12 bg-zinc-100 border border-zinc-200 rounded-sm flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-zinc-700" />
              </div>
              <h4 className="text-lg font-semibold text-zinc-900 mb-3">Role-Based Access Control</h4>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Strict compartmentalization of duties. Assign distinct roles (Administrator, Manager, Member) to enforce security protocol and prevent unauthorized alterations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ARCHITECTURE SUMMARY */}
      <section id="architecture" className="py-24 bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-sm font-bold text-blue-700 tracking-widest uppercase mb-3">Infrastructure Overview</h2>
              <h3 className="text-3xl font-semibold text-zinc-900 mb-6">Engineered for Reliability</h3>
              <p className="text-zinc-600 text-lg mb-8 leading-relaxed">
                Our architecture combines distributed cloud data stores with transient WebSocket communication channels, ensuring high availability, sub-50ms latency, and persistent audit records.
              </p>
              
              <ul className="space-y-4">
                {[
                  'Cloud-Native Document Database (Firestore)',
                  'Bidirectional WebSocket Streaming (WSS)',
                  'End-to-End JWT Authentication',
                  'Optimistic UI State Resolution'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                    <span className="text-zinc-700 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-zinc-50 border border-zinc-200 p-8 rounded-sm shadow-sm">
              <div className="font-mono text-xs text-zinc-600 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                  <span className="font-semibold text-zinc-900">SYSTEM.STATUS</span>
                  <span className="text-emerald-600">OPERATIONAL</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                  <span className="font-semibold text-zinc-900">DB.LATENCY</span>
                  <span>42ms</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                  <span className="font-semibold text-zinc-900">SOCKET.PROTOCOL</span>
                  <span>WSS://</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                  <span className="font-semibold text-zinc-900">AUTH.METHOD</span>
                  <span>OAUTH2 / JWT</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="font-semibold text-zinc-900">UI.FRAMEWORK</span>
                  <span>REACT / TAILWIND</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-24 bg-zinc-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-sm font-bold text-blue-700 tracking-widest uppercase mb-3">Documentation</h2>
            <h3 className="text-3xl font-semibold text-zinc-900">Frequently Asked Questions</h3>
          </div>
          
          <div className="space-y-4">
            {FAQS.map((faq, index) => (
              <div key={index} className="bg-white border border-zinc-200 rounded-sm shadow-sm overflow-hidden">
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center focus:outline-none hover:bg-zinc-50 transition-colors"
                >
                  <span className="font-medium text-zinc-900">{faq.question}</span>
                  <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${openFaqIndex === index ? 'rotate-180' : ''}`} />
                </button>
                {openFaqIndex === index && (
                  <div className="px-6 pb-5">
                    <p className="text-sm text-zinc-600 leading-relaxed border-t border-zinc-100 pt-4">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-zinc-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-zinc-900 flex items-center justify-center rounded-sm">
              <Layers className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-zinc-900">
              Velocity
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            &copy; {new Date().getFullYear()} Velocity Platform. Official Management System.
          </p>
        </div>
      </footer>
    </div>
  );
};

// Simple Icon fallback since LayoutGrid isn't exported in original list
const LayoutGrid = (props: any) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="7" height="7" x="3" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="14" rx="1" />
    <rect width="7" height="7" x="3" y="14" rx="1" />
  </svg>
);
