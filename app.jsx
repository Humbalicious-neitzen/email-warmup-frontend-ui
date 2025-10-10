import React, { useState, useEffect, useCallback } from 'react';
// Lucide icons are essential for a modern look
import { Home, Mail, Activity, LogOut, Menu, X, User, Zap, Info } from 'lucide-react';

// --- 1. FIREBASE SETUP (REQUIRED FOR AUTH AND STATE PERSISTENCE) ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  collection, 
  query, 
  onSnapshot, 
  orderBy 
} from 'firebase/firestore';

// Mock global variables assumed to be provided by the environment
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-warmup-app';

// Initialize Firebase services
let app, db, auth;
if (Object.keys(firebaseConfig).length > 0) {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
    } catch (e) {
        console.error("Firebase Initialization Error:", e);
    }
}

// Custom type definitions
interface EmailAccount {
  id: string;
  email: string;
  status: 'Connecting' | 'Active' | 'Paused' | 'Error';
  sentCount: number;
  receivedCount: number;
  lastConnected: Date;
}

// --- 2. AUTH CONTEXT/HOOK (Simplified to handle Canvas Auth) ---
const AuthContext = React.createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    if (!auth) {
        console.error("Auth object is null. Cannot proceed with authentication.");
        setIsAuthReady(true);
        setUserId(crypto.randomUUID()); // Fallback user ID
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
            setUserId(currentUser.uid);
        } else {
            // Use custom token if provided, otherwise sign in anonymously
            try {
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Authentication failed:", error);
                setUserId(crypto.randomUUID()); // Fallback user ID on error
            }
        }
        setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const logout = useCallback(() => {
    if (auth) {
        signOut(auth).catch(e => console.error("Logout failed:", e));
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, userId, isAuthReady, logout, db, auth }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => React.useContext(AuthContext);

// --- 3. UI COMPONENTS ---

// Helper for navigation links
const NavLink = ({ name, href, icon: Icon, isCurrent, onClick }) => (
  <div
    className={`flex items-center px-4 py-3 rounded-xl cursor-pointer transition-colors duration-150 ${
      isCurrent
        ? 'bg-blue-600 text-white shadow-lg'
        : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
    }`}
    onClick={onClick}
  >
    <Icon className={`h-5 w-5 ${isCurrent ? 'text-white' : 'text-blue-500'}`} aria-hidden="true" />
    <span className="ml-3 font-medium">{name}</span>
  </div>
);

// Main Layout Component
const Layout = ({ children, currentPage, setCurrentPage, navigation, logout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { userId } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Static sidebar for desktop */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64 bg-white border-r border-gray-200 shadow-xl">
          <div className="flex items-center justify-center h-20 bg-blue-700 p-4">
            <h1 className="text-2xl font-black text-white flex items-center">
                <Zap className="h-6 w-6 mr-2" />
                WarmUp AI
            </h1>
          </div>
          <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-2">
            <nav className="flex-1 space-y-2">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  name={item.name}
                  href={item.href}
                  icon={item.icon}
                  isCurrent={currentPage === item.href}
                  onClick={() => setCurrentPage(item.href)}
                />
              ))}
            </nav>
            
            <div className="pt-4 border-t border-gray-200">
                {userId && (
                     <div className="text-xs text-gray-500 mb-2 p-2 break-all bg-gray-100 rounded-lg">
                        User ID: <span className="font-mono text-gray-700">{userId}</span>
                    </div>
                )}
                <NavLink
                    name="Log Out"
                    href="#"
                    icon={LogOut}
                    isCurrent={false}
                    onClick={logout}
                />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-gray-600 opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex flex-col w-64 h-full bg-white shadow-xl">
            <div className="flex items-center justify-between h-20 p-4 bg-blue-700">
                <h1 className="text-xl font-black text-white flex items-center">
                    <Zap className="h-5 w-5 mr-2" />
                    WarmUp AI
                </h1>
              <button
                type="button"
                className="text-white hover:text-gray-200"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <nav className="flex-1 flex flex-col p-4 space-y-2">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  name={item.name}
                  href={item.href}
                  icon={item.icon}
                  isCurrent={currentPage === item.href}
                  onClick={() => { setCurrentPage(item.href); setSidebarOpen(false); }}
                />
              ))}
              <div className="pt-4 border-t border-gray-200">
                 <NavLink
                    name="Log Out"
                    href="#"
                    icon={LogOut}
                    isCurrent={false}
                    onClick={() => { logout(); setSidebarOpen(false); }}
                />
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 max-w-full overflow-x-hidden">
        <header className="flex items-center justify-between h-20 bg-white border-b border-gray-200 px-4 shadow-sm lg:px-6">
          <button
            type="button"
            className="text-gray-500 hover:text-gray-900 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900">
            {navigation.find(n => n.href === currentPage)?.name}
          </h2>
          <div className="flex items-center space-x-4">
             <div className="flex items-center text-sm font-medium text-gray-700">
                <User className="h-5 w-5 text-blue-500 mr-2" />
                Welcome, {userId ? 'User' : 'Guest'}
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

// --- PAGE COMPONENTS ---

const DashboardPage = () => {
  const { userId, db } = useAuth();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);

  useEffect(() => {
    if (!db || !userId) return;

    const accountCollectionRef = collection(db, 'artifacts', appId, 'users', userId, 'emailAccounts');
    const q = query(accountCollectionRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedAccounts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastConnected: doc.data().lastConnected?.toDate ? doc.data().lastConnected.toDate() : new Date(doc.data().lastConnected || 0),
      })) as EmailAccount[];
      setAccounts(fetchedAccounts);
    }, (error) => {
      console.error("Error fetching accounts:", error);
    });

    return () => unsubscribe();
  }, [db, userId]);

  const totalActive = accounts.filter(a => a.status === 'Active').length;
  const totalSent = accounts.reduce((sum, a) => sum + a.sentCount, 0);
  const totalReceived = accounts.reduce((sum, a) => sum + a.receivedCount, 0);

  const StatCard = ({ title, value, colorClass, icon: Icon }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 transition-transform transform hover:scale-[1.02]">
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3 rounded-full ${colorClass} bg-opacity-20`}>
          <Icon className={`h-6 w-6 ${colorClass}`} />
        </div>
        <div className="ml-5">
          <h3 className="text-sm font-medium text-gray-500 truncate">{title}</h3>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Deliverability Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Accounts" 
          value={accounts.length} 
          colorClass="text-blue-600" 
          icon={Mail} 
        />
        <StatCard 
          title="Active Warmup" 
          value={totalActive} 
          colorClass="text-green-600" 
          icon={Activity} 
        />
        <StatCard 
          title="Total Sent (Warmup)" 
          value={totalSent} 
          colorClass="text-purple-600" 
          icon={Zap} 
        />
        <StatCard 
          title="Total Replies/Engaged" 
          value={totalReceived} 
          colorClass="text-yellow-600" 
          icon={Home} 
        />
      </div>

      {/* Account Performance Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <h2 className="text-2xl font-semibold text-gray-800 p-6 border-b">Account Performance</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Connected</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No accounts connected yet. Go to Email Management to add one!
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{account.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        account.status === 'Active' ? 'bg-green-100 text-green-800' :
                        account.status === 'Connecting' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {account.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.sentCount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.receivedCount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {account.lastConnected.toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const EmailManagementPage = () => {
  const { userId, db } = useAuth();
  const [apiURL, setApiURL] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);

  // 1. Fetch Accounts from Firestore
  useEffect(() => {
    if (!db || !userId) return;

    const accountCollectionRef = collection(db, 'artifacts', appId, 'users', userId, 'emailAccounts');
    const q = query(accountCollectionRef, orderBy('lastConnected', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedAccounts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastConnected: doc.data().lastConnected?.toDate ? doc.data().lastConnected.toDate() : new Date(doc.data().lastConnected || 0),
      })) as EmailAccount[];
      setAccounts(fetchedAccounts);
    }, (error) => {
      console.error("Error fetching accounts:", error);
    });

    return () => unsubscribe();
  }, [db, userId]);


  // 2. Handle Connection via Deployed Backend API
  const handleConnect = async (e) => {
    e.preventDefault();
    if (!apiURL || !email || !password || !userId || !db) {
        setMessage({ text: 'Please ensure API URL, Email, and Password are filled out.', type: 'error' });
        return;
    }
    
    setIsConnecting(true);
    setMessage({ text: 'Attempting connection via Render API...', type: 'info' });

    // 2a. Attempt to call the Render API
    try {
        const response = await fetch(`${apiURL}/api/emails/connect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, userId }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            
            // 2b. API Success: Save the returned data to Firestore
            // We use the email address itself as the document ID for simplicity
            const docRef = doc(db, 'artifacts', appId, 'users', userId, 'emailAccounts', email);
            
            await setDoc(docRef, {
                email: data.account.email,
                status: 'Active',
                sentCount: data.account.sentCount,
                receivedCount: data.account.receivedCount,
                lastConnected: new Date(),
                // NOTE: Password is NOT stored here, only in the secure backend service.
            });

            setMessage({ text: data.message, type: 'success' });
            setEmail('');
            setPassword('');

        } else {
            // API Error (e.g., failed credential verification)
            setMessage({ text: data.message || 'Connection failed: Backend error.', type: 'error' });
        }

    } catch (error) {
        console.error("Fetch Error:", error);
        setMessage({ text: `Failed to reach API at ${apiURL}. Check the URL and server logs.`, type: 'error' });
    } finally {
        setIsConnecting(false);
    }
  };

  // Helper for deleting an account (Optional: Requires security rules update)
  const handleDelete = async (accountId) => {
      if (!db || !userId) return;
      if (window.confirm(`Are you sure you want to disconnect ${accountId}?`)) {
          try {
              // This is commented out because Firestore security rules prevent deletes by default.
              // To enable deletion, you'd need the deleteDoc function and appropriate rules.
              // deleteDoc(doc(db, 'artifacts', appId, 'users', userId, 'emailAccounts', accountId)); 
              setMessage({ text: `${accountId} disconnected (simulated, deletion disabled in UI).`, type: 'info' });
          } catch(e) {
              console.error("Delete failed:", e);
              setMessage({ text: "Failed to delete account.", type: 'error' });
          }
      }
  };


  const MessageAlert = ({ text, type }) => {
    if (!text) return null;
    let style = "bg-blue-100 text-blue-800 border-blue-400"; // info
    if (type === 'success') style = "bg-green-100 text-green-800 border-green-400";
    if (type === 'error') style = "bg-red-100 text-red-800 border-red-400";

    return (
        <div className={`mt-4 p-4 text-sm border-l-4 rounded-xl font-medium ${style}`}>
            {text}
        </div>
    );
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Email Account Management</h1>
      
      {/* API Configuration */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-200">
        <h2 className="text-xl font-semibold text-blue-700 flex items-center mb-4">
            <Zap className="h-5 w-5 mr-2" />
            Warmup Service Configuration
        </h2>
        <p className="text-sm text-gray-600 mb-4 flex items-start">
            <Info className="h-5 w-5 mr-2 text-blue-500 flex-shrink-0" />
            Your Render.com backend service must be running at this URL to connect new accounts.
        </p>
        <label htmlFor="api-url" className="block text-sm font-medium text-gray-700 mb-2">
            Backend API URL (e.g., https://your-app.onrender.com)
        </label>
        <input
            id="api-url"
            type="url"
            value={apiURL}
            onChange={(e) => setApiURL(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            placeholder="Paste your Render URL here"
        />
      </div>

      {/* Account Connection Form */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Connect New Email Account</h2>
        <form onSubmit={handleConnect} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., mywarmup@gmail.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">App Password / SMTP Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Your email account password or app-specific password"
            />
            <p className="text-xs text-gray-500 mt-1">Note: In a real app, this is sent securely to your Render backend.</p>
          </div>
          
          <button
            type="submit"
            disabled={isConnecting}
            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white transition-colors ${
                isConnecting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isConnecting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </>
            ) : 'Connect Account via API'}
          </button>
          
          <MessageAlert text={message.text} type={message.type} />
        </form>
      </div>
      
      {/* Existing Accounts List */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mt-8">
        <h2 className="text-2xl font-semibold text-gray-800 p-6 border-b">Existing Warmup Accounts ({accounts.length})</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Sync</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No accounts found. Use the form above to connect one.
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{account.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        account.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {account.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {account.lastConnected.toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                            onClick={() => handleDelete(account.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                        >
                            Disconnect
                        </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


const WarmupControlPage = () => (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Warmup Control & Settings</h1>
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 space-y-6">
        <p className="text-gray-600">
            This section would contain the detailed settings for controlling the email sending ramp-up (e.g., daily volume limit, max sent emails, reply rate simulation, etc.). Since the core logic is handled by your <strong className="text-blue-600">Render backend</strong>, the controls here would communicate with a <code className="bg-gray-100 p-1 rounded">/api/warmup/settings</code> endpoint.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Limit */}
            <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Daily Volume Limit (per account)</label>
                <input type="number" defaultValue={50} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm" />
                <p className="text-xs text-gray-500">How many warm-up emails to send max per day.</p>
            </div>
            
            {/* Ramp-up Rate */}
            <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Daily Increase Percentage</label>
                <input type="number" defaultValue={10} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm" />
                <p className="text-xs text-gray-500">Increase volume by this % each day (e.g., 10%).</p>
            </div>

            {/* Target Reply Rate */}
            <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Target Reply Rate (%)</label>
                <input type="number" defaultValue={30} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm" />
                <p className="text-xs text-gray-500">Target percentage of emails that receive a reply/engagement.</p>
            </div>
            
            {/* Template Selection */}
            <div className="space-y-1">
                 <label className="block text-sm font-medium text-gray-700">Warmup Content Profile</label>
                <select className="w-full p-3 border border-gray-300 rounded-lg shadow-sm">
                    <option>Standard Conversation (Simulated)</option>
                    <option>Industry Specific (Simulated)</option>
                </select>
                <p className="text-xs text-gray-500">Type of email content used in the warmup network.</p>
            </div>
        </div>

        <button 
            onClick={() => alert('Settings updated (simulated). This would send data to your Render API.')}
            className="w-full py-3 px-4 rounded-xl text-white font-medium bg-blue-600 hover:bg-blue-700 transition-colors"
        >
            Save Warmup Settings
        </button>
      </div>
    </div>
);


// --- 4. MAIN APPLICATION COMPONENT ---

const AppContent = () => {
  const { isAuthReady, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState('/');

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Email Management', href: '/emails', icon: Mail },
    { name: 'Warmup Control', href: '/warmup', icon: Activity },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case '/':
        return <DashboardPage />;
      case '/emails':
        return <EmailManagementPage />;
      case '/warmup':
        return <WarmupControlPage />;
      default:
        return <DashboardPage />;
    }
  };
  
  // Display a loading state while Firebase Auth initializes
  if (!isAuthReady) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="text-lg text-gray-600 flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Initializing Application...
            </div>
        </div>
    );
  }


  return (
    <Layout 
      currentPage={currentPage} 
      setCurrentPage={setCurrentPage} 
      navigation={navigation} 
      logout={logout}
    >
      {renderPage()}
    </Layout>
  );
};

// Main Export
const App = () => {
    // Check if Firebase is initialized
    if (!app) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
                <div className="bg-white p-8 rounded-xl shadow-2xl border border-red-300 max-w-md text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
                    <p className="text-gray-700">
                        Firebase configuration is missing. This application relies on Firebase for persistent storage and authentication.
                    </p>
                    <p className="mt-4 text-sm text-gray-500">
                        Please ensure the <code className="bg-gray-100 p-1 rounded">__firebase_config</code> and <code className="bg-gray-100 p-1 rounded">__app_id</code> environment variables are correctly provided.
                    </p>
                </div>
            </div>
        );
    }
    
    // Render the main app wrapped in the AuthProvider
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;
