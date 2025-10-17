import React, { useState, useEffect, useContext, createContext } from 'react';
import { Home, Mail, Activity, LogOut, Menu, X, User, Zap, Settings, RefreshCw, CheckCircle, AlertTriangle, Cloud, Loader2 } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, collection, query, setDoc } from 'firebase/firestore';

// --- GLOBAL VARIABLES (Provided by Canvas Environment) ---
// These variables must remain global for the app to initialize.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-warmup-app';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- FIREBASE INITIALIZATION AND AUTH CONTEXT ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const AuthContext = createContext({
  user: null,
  userId: null,
  isAuthReady: false,
  logout: () => {},
});

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setUserId(currentUser.uid);
      } else {
        // Sign in anonymously if no token is available or needed
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Error signing in anonymously:", error);
        }
      }
      setIsAuthReady(true);
    });

    if (initialAuthToken) {
      signInWithCustomToken(auth, initialAuthToken)
        .catch(error => {
          console.error("Error signing in with custom token:", error);
          // If token fails, fall back to anonymous sign-in, which onAuthStateChanged will handle
        });
    }

    return () => unsubscribe();
  }, []);

  const logout = () => {
    // In a real app, implement proper sign out
    console.log("Logout triggered. In a live app, this signs out the user.");
  };

  return (
    <AuthContext.Provider value={{ user, userId, isAuthReady, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// --- APP DATA STRUCTURES ---

const STATUS_MAP = {
  active: { text: 'Active', color: 'bg-green-100 text-green-700' },
  paused: { text: 'Paused', color: 'bg-yellow-100 text-yellow-700' },
  error: { text: 'Error', color: 'bg-red-100 text-red-700' },
};

// --- GENERAL COMPONENTS ---

const Card = ({ children, title, className = '' }) => (
  <div className={`bg-white shadow-xl rounded-xl p-4 sm:p-6 ${className}`}>
    {title && <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>}
    {children}
  </div>
);

const Button = ({ children, onClick, disabled = false, loading = false, variant = 'primary', className = '' }) => {
  const baseStyle = "px-4 py-2 font-semibold rounded-lg transition duration-150 ease-in-out flex items-center justify-center";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/50",
    secondary: "bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-4 focus:ring-gray-400/50",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-4 focus:ring-red-500/50",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
};

const Input = ({ label, id, type = 'text', value, onChange, placeholder = '', required = false }) => (
  <div className="space-y-1">
    {label && (
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
    )}
    <input
      type={type}
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="mt-1 block w-full rounded-lg border border-gray-300 p-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition"
    />
  </div>
);

// --- PAGE COMPONENTS ---

const DashboardPage = () => {
  const { userId, isAuthReady } = useAuth();
  const [stats, setStats] = useState({ totalAccounts: 0, activeWarmup: 0, deliverabilityScore: 'N/A' });
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (!isAuthReady || !userId) return;

    // Simulate real-time stats fetching (this is where API calls or Firestore listeners would go)
    const statsRef = doc(db, 'artifacts', appId, 'users', userId, 'dashboard', 'stats');
    const logsRef = collection(db, 'artifacts', appId, 'users', userId, 'logs');
    const logsQuery = query(logsRef); // In a real app, you would add limits/sorting here

    const unsubscribeStats = onSnapshot(statsRef, (doc) => {
      if (doc.exists()) {
        setStats(doc.data());
      } else {
        // Initialize if not exists
        setStats({ totalAccounts: 0, activeWarmup: 0, deliverabilityScore: 'N/A' });
        setDoc(statsRef, { totalAccounts: 0, activeWarmup: 0, deliverabilityScore: 'N/A' }, { merge: true });
      }
    });

    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      const logData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by timestamp descending (simulated timestamp for simplicity)
      logData.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setLogs(logData.slice(0, 10)); // Show top 10 logs
    });

    return () => {
      unsubscribeStats();
      unsubscribeLogs();
    };
  }, [userId, isAuthReady]);

  const statCards = [
    { title: 'Total Accounts', value: stats.totalAccounts, icon: Mail, color: 'bg-indigo-500' },
    { title: 'Active Warmups', value: stats.activeWarmup, icon: Activity, color: 'bg-green-500' },
    { title: 'Avg. Deliverability', value: stats.deliverabilityScore, icon: CheckCircle, color: 'bg-yellow-500' },
  ];

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <Card key={index} className="flex items-center space-x-4">
            <div className={`p-3 rounded-full ${card.color} text-white`}>
              <card.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card title="Latest Warmup Activity Log">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.length > 0 ? logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.event}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${log.status === 'success' ? STATUS_MAP.active.color : STATUS_MAP.error.color}`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                    No recent warmup activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const EmailManagementPage = () => {
  const { userId, isAuthReady } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [backendUrl, setBackendUrl] = useState('https://email-warmup-tool.onrender.com'); // Default to the live Render backend
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);

  const accountCollectionPath = doc(db, 'artifacts', appId, 'users', userId, 'emailAccounts', 'list');

  useEffect(() => {
    if (!isAuthReady || !userId) return;

    // Listener for real-time updates to email accounts
    const unsubscribe = onSnapshot(accountCollectionPath, (doc) => {
      if (doc.exists()) {
        setAccounts(doc.data().emails || []);
      } else {
        setAccounts([]);
      }
    });

    return () => unsubscribe();
  }, [userId, isAuthReady]);

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!userId || !backendUrl) {
      setMessage({ type: 'error', text: 'Backend URL or User ID is missing.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    // 1. Simulate API call to the live Render backend
    try {
      const response = await fetch(`${backendUrl}/api/emails/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, userId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 2. If API call is successful, save the mock account data to Firestore
        const newAccount = {
          email,
          status: 'active',
          volume: 10,
          joined: Date.now(),
          lastSync: Date.now(),
        };

        const currentAccounts = accounts.length > 0 ? accounts : [];

        await setDoc(accountCollectionPath, {
          emails: [...currentAccounts, newAccount],
        }, { merge: true });

        setMessage({ type: 'success', text: `Successfully connected: ${email}. Warmup started.` });
        setEmail('');
        setPassword('');

        // Simulate logging the event to the dashboard log
        await setDoc(doc(db, 'artifacts', appId, 'users', userId, 'logs', Date.now().toString()), {
          timestamp: Date.now(),
          event: 'Account Connected',
          email: email,
          status: 'success',
        }, { merge: true });

      } else {
        // Handle API error response
        setMessage({ type: 'error', text: data.message || 'API connection failed. Check credentials.' });
      }
    } catch (error) {
      console.error('Connection Error:', error);
      setMessage({ type: 'error', text: `Could not reach API: ${error.message}. Check your URL.` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (targetEmail) => {
    if (!userId) return;

    const updatedAccounts = accounts.filter(acc => acc.email !== targetEmail);

    try {
      await setDoc(accountCollectionPath, { emails: updatedAccounts }, { merge: true });
      setMessage({ type: 'success', text: `${targetEmail} removed successfully.` });

      // Simulate logging the event
      await setDoc(doc(db, 'artifacts', appId, 'users', userId, 'logs', Date.now().toString()), {
        timestamp: Date.now(),
        event: 'Account Removed',
        email: targetEmail,
        status: 'warning',
      }, { merge: true });
      
    } catch (error) {
      console.error("Remove Error:", error);
      setMessage({ type: 'error', text: 'Failed to remove account.' });
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <h1 className="text-3xl font-bold text-gray-900">Email Account Management</h1>

      {/* Backend URL Input */}
      <Card title="Backend API Configuration (Render)" className="border border-indigo-200">
        <Input
          label="Backend API URL"
          id="backend-url"
          value={backendUrl}
          onChange={(e) => setBackendUrl(e.target.value)}
          placeholder="e.g., https://your-warmup-api.onrender.com"
        />
        <p className="mt-2 text-xs text-gray-500 flex items-center">
            <Cloud className="h-4 w-4 mr-1 text-indigo-500" />
            Your live backend is hosted on Render. Ensure the URL is correct to enable warmup.
        </p>
      </Card>

      {/* Connection Form */}
      <Card title="Connect New Email Account">
        {message && (
          <div className={`p-3 mb-4 rounded-lg flex items-center text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.type === 'success' ? <CheckCircle className="h-5 w-5 mr-2" /> : <AlertTriangle className="h-5 w-5 mr-2" />}
            {message.text}
          </div>
        )}
        <form onSubmit={handleConnect} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Input
            label="Email Address (SMTP/IMAP)"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g., marketing@yourdomain.com"
            required
          />
          <Input
            label="App Password / Token"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="This is stored securely by the API"
            required
          />
          <Button type="submit" loading={isLoading} disabled={!email || !password || !backendUrl} className="w-full md:w-auto">
            {isLoading ? 'Connecting...' : 'Connect Account via API'}
          </Button>
        </form>
      </Card>

      {/* Existing Accounts Table */}
      <Card title="Existing Warmup Accounts">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Daily Volume
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accounts.length > 0 ? accounts.map((account) => (
                <tr key={account.email} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{account.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_MAP[account.status]?.color}`}>
                      {STATUS_MAP[account.status]?.text}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.volume}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Button variant="secondary" className="p-2 h-auto text-xs" onClick={() => console.log('Pause Warmup')}>
                      <Zap className="h-4 w-4 mr-1" /> Pause
                    </Button>
                    <Button variant="danger" className="p-2 h-auto text-xs" onClick={() => handleRemove(account.email)}>
                      <X className="h-4 w-4 mr-1" /> Remove
                    </Button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                    No email accounts are currently connected.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-gray-500">User ID for troubleshooting: {userId}</p>
        </div>
      </Card>
    </div>
  );
};

const WarmupControlPage = () => (
  <div className="p-4 md:p-8 space-y-6">
    <h1 className="text-3xl font-bold text-gray-900">Warmup Control & Strategy</h1>
    <Card title="Global Warmup Settings">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Configure the automated ramp-up schedule and engagement rules across all connected accounts.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Max Daily Emails (Per Account)" id="max-daily" type="number" placeholder="50" />
          <Input label="Daily Volume Increase (%)" id="daily-increase" type="number" placeholder="10" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Target Reply Rate (%)" id="target-reply" type="number" placeholder="15" />
          <Input label="Warmup Duration (Days)" id="warmup-days" type="number" placeholder="30" />
        </div>
        <Button variant="primary">
          <Settings className="h-4 w-4 mr-2" /> Save Global Settings
        </Button>
      </div>
    </Card>

    <Card title="Engagement Simulation Rules">
      <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
        <li>Automatically move emails from **Spam** to **Primary Inbox** upon arrival.</li>
        <li>Simulate **human-like replies** to warm-up emails within 3 hours.</li>
        <li>Mark warm-up emails as **Important** to improve sender reputation.</li>
        <li>Monitor DNS records (SPF, DKIM, DMARC) for authentication issues.</li>
      </ul>
      <Button variant="secondary" className="mt-4">
        <RefreshCw className="h-4 w-4 mr-2" /> View Detailed Diagnostics
      </Button>
    </Card>
  </div>
);

// --- MAIN LAYOUT & ROUTING ---

const Layout = ({ children, currentPage, setCurrentPage }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const userId = user?.uid;

  const navigation = [
    { name: 'Dashboard', href: 'dashboard', icon: Home },
    { name: 'Email Management', href: 'emails', icon: Mail },
    { name: 'Warmup Control', href: 'warmup', icon: Activity },
  ];

  const NavLink = ({ item }) => (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        setCurrentPage(item.href);
        setSidebarOpen(false);
      }}
      className={`group flex items-center px-2 py-3 text-base font-medium rounded-lg transition duration-150 ease-in-out ${
        currentPage === item.href
          ? 'bg-indigo-700 text-white shadow-lg'
          : 'text-indigo-100 hover:bg-indigo-600 hover:text-white'
      }`}
    >
      <item.icon className={`mr-4 h-6 w-6 transition duration-150 ${currentPage === item.href ? 'text-white' : 'text-indigo-200 group-hover:text-white'}`} aria-hidden="true" />
      {item.name}
    </a>
  );

  return (
    <div className="min-h-screen flex">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-indigo-800">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <X className="h-6 w-6 text-white" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <Zap className="h-8 w-8 text-white" />
              <span className="text-xl font-bold text-white ml-2">Warmup AI</span>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navigation.map((item) => (
                <NavLink key={item.name} item={item} />
              ))}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-indigo-700 p-4">
            <div className="flex items-center">
              <div className="ml-3">
                <p className="text-sm font-medium text-white">User: {userId ? userId.substring(0, 8) + '...' : 'Guest'}</p>
                <button onClick={logout} className="text-xs font-medium text-indigo-200 hover:text-white">
                  <LogOut className="h-4 w-4 inline mr-1" /> Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64 bg-indigo-800 rounded-r-xl shadow-2xl">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <Zap className="h-8 w-8 text-white" />
              <span className="text-2xl font-extrabold text-white ml-2 tracking-wide">Warmup AI</span>
            </div>
            <nav className="mt-6 flex-1 px-4 space-y-1">
              {navigation.map((item) => (
                <NavLink key={item.name} item={item} />
              ))}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-indigo-700 p-4">
            <div className="flex items-center w-full">
              <div className="flex-shrink-0 h-10 w-10 bg-indigo-900 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-indigo-300" />
              </div>
              <div className="ml-3 truncate">
                <p className="text-sm font-medium text-white truncate">User ID: {userId}</p>
                <button onClick={logout} className="text-xs font-medium text-indigo-200 hover:text-white transition">
                  <LogOut className="h-4 w-4 inline mr-1" /> Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="lg:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-gray-50">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const App = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { isAuthReady } = useAuth();

  const renderPage = () => {
    if (!isAuthReady) {
      return (
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mr-2" />
          <p className="text-lg text-gray-700">Initializing services...</p>
        </div>
      );
    }
    
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'emails':
        return <EmailManagementPage />;
      case 'warmup':
        return <WarmupControlPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <Layout currentPage={currentPage} setCurrentPage={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
};

// --- APPLICATION WRAPPER ---
// This ensures AuthContext is available to the entire App component
export default () => (
    <AuthProvider>
        <App />
    </AuthProvider>
);
