import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5101/api';

const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use((request) => {
  const token = localStorage.getItem('hairwig_token');
  if (token) {
    request.headers.Authorization = `Bearer ${token}`;
  } else {
    delete request.headers.Authorization;
  }
  return request;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('hairwig_token');
      localStorage.removeItem('hairwig_user');
      localStorage.removeItem('hairwig_permissions');
      window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

const emptyBranch = {
  BranchCode: '',
  BranchName: '',
  Address: '',
  GSTIN: '',
  StateCode: '',
  Terms: [''],
};

const emptyUser = {
  FullName: '',
  Username: '',
  Password: '',
  Email: '',
  Mobile: '',
  RoleName: 'User',
  RoleCode: 'USER',
  BranchId: '',
};

const emptyClient = {
  ClientName: '',
  Address: '',
  ContactNo: '',
  Email: '',
  ClientPan: '',
  ClientCst: '',
};

const emptyBrand = {
  BrandName: '',
};

const emptyUnit = {
  UnitName: '',
};

const emptyGroup = {
  GroupName: '',
};

const emptyTreatment = {
  TreatmentName: '',
  AliasName: '',
  TaxRate: '',
  TotalPrice: '',
  TreatmentType: '',
  ProductType: '',
  HSNCode: '',
};

const emptyItem = {
  ItemName: '',
  Brand: '',
  GroupName: '',
  Unit: '',
  TotalPrice: '',
  OpeningStock: '',
  TaxRate: '',
};

const emptyBill = {
  BranchId: '',
  CustomerName: '',
  CustomerMobile: '',
  CustomerAddress: '',
  CustomerEmail: '',
  BillDate: getLocalDateKey(),
  NextServiceDate: '',
  PaymentMode: 'Cash',
};

const formatINR = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
}).format(Number(value || 0));

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function App() {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('hairwig_token');
    const rawUser = localStorage.getItem('hairwig_user');
    const rawPermissions = localStorage.getItem('hairwig_permissions');

    return {
      token,
      user: rawUser ? JSON.parse(rawUser) : null,
      permissions: rawPermissions ? JSON.parse(rawPermissions) : {},
    };
  });

  useEffect(() => {
    api.defaults.headers.common.Authorization = auth.token ? `Bearer ${auth.token}` : '';
    if (auth.token) {
      localStorage.setItem('hairwig_token', auth.token);
      localStorage.setItem('hairwig_user', JSON.stringify(auth.user || {}));
      localStorage.setItem('hairwig_permissions', JSON.stringify(auth.permissions || {}));
    } else {
      localStorage.removeItem('hairwig_token');
      localStorage.removeItem('hairwig_user');
      localStorage.removeItem('hairwig_permissions');
    }
  }, [auth]);

  const value = useMemo(
    () => ({
      auth,
      setAuth,
      hasAccess: (moduleName, action) => Boolean(auth.permissions?.[moduleName]?.[action]),
    }),
    [auth],
  );

  return (
    <AuthContext.Provider value={value}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedAppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/branches" element={<BranchesPage />} />
            <Route path="/clients" element={<MasterPage key="/clients" config={clientMasterConfig} />} />
            <Route path="/brands" element={<MasterPage key="/brands" config={brandMasterConfig} />} />
            <Route path="/units" element={<MasterPage key="/units" config={unitMasterConfig} />} />
            <Route path="/groups" element={<MasterPage key="/groups" config={groupMasterConfig} />} />
            <Route path="/treatments" element={<MasterPage key="/treatments" config={treatmentMasterConfig} />} />
            <Route path="/items" element={<MasterPage key="/items" config={itemMasterConfig} />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/roles" element={<Navigate to="/dashboard" replace />} />
            <Route path="/bills" element={<BillsPage key="/bills" />} />
            <Route path="/bill-list" element={<BillsPage key="/bill-list" listOnly />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

const AuthContext = createContext(null);

function getAuthRoleCode(user) {
  const rawRole = String(user?.RoleCode || user?.roleCode || user?.RoleName || user?.role || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (rawRole === 'BRANCHADMIN') return 'BRANCH_ADMIN';
  if (rawRole === 'SUPERADMIN') return 'SUPER_ADMIN';
  return rawRole;
}

function useAuth() {
  return useContext(AuthContext);
}

function ProtectedAppLayout() {
  const { auth, setAuth, hasAccess } = useAuth();
  const navigate = useNavigate();
  const currentRoleCode = getAuthRoleCode(auth.user);
  const isRegularUser = currentRoleCode === 'USER';
  const isBranchAdmin = currentRoleCode === 'BRANCH_ADMIN';
  const hideOperationalMasters = isRegularUser || isBranchAdmin;
  const canViewUsers = isBranchAdmin || hasAccess('users', 'canView');

  useEffect(() => {
    if (!auth.token) {
      navigate('/login');
    }
  }, [auth.token, navigate]);

  if (!auth.token) {
    return null;
  }

  const logout = () => {
    setAuth({ token: '', user: null, permissions: {} });
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-box">
          <div className="brand-mark">H</div>
          <div>
            <strong>HairWigHouse</strong>
            <small>Business Suite</small>
          </div>
        </div>

        <nav className="nav">
          <p className="nav-caption">Workspace</p>
          <NavLink to="/dashboard">Dashboard</NavLink>
          {!hideOperationalMasters && <NavLink to="/branches">Branch Master</NavLink>}
          {!hideOperationalMasters && <NavLink to="/clients">Client Master</NavLink>}
          {!hideOperationalMasters && <NavLink to="/brands">Brand Master</NavLink>}
          {!hideOperationalMasters && <NavLink to="/units">Unit Master</NavLink>}
          {!hideOperationalMasters && <NavLink to="/groups">Group Master</NavLink>}
          {!hideOperationalMasters && <NavLink to="/treatments">Treatment Master</NavLink>}
          {!hideOperationalMasters && <NavLink to="/items">Item Master</NavLink>}
          {!isRegularUser && canViewUsers && <NavLink to="/users">User Master</NavLink>}
          <NavLink to="/bills">Bills</NavLink>
          <NavLink to="/bill-list">Bill List</NavLink>
          <NavLink to="/payments">Payment List</NavLink>
          <NavLink to="/reports">Reports</NavLink>
        </nav>

        <div className="user-card">
          <div>
            <h4>{auth.user?.FullName || auth.user?.Username || 'User'}</h4>
            <p>{auth.user?.RoleName || 'User'}</p>
          </div>
          <button type="button" onClick={logout} className="ghost-btn">Logout</button>
        </div>
      </aside>

      <main className="main-panel">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/branches" element={hideOperationalMasters ? <Navigate to="/dashboard" replace /> : <BranchesPage />} />
          <Route path="/clients" element={hideOperationalMasters ? <Navigate to="/dashboard" replace /> : <MasterPage key="/clients" config={clientMasterConfig} />} />
          <Route path="/brands" element={hideOperationalMasters ? <Navigate to="/dashboard" replace /> : <MasterPage key="/brands" config={brandMasterConfig} />} />
          <Route path="/units" element={hideOperationalMasters ? <Navigate to="/dashboard" replace /> : <MasterPage key="/units" config={unitMasterConfig} />} />
          <Route path="/groups" element={hideOperationalMasters ? <Navigate to="/dashboard" replace /> : <MasterPage key="/groups" config={groupMasterConfig} />} />
          <Route path="/treatments" element={hideOperationalMasters ? <Navigate to="/dashboard" replace /> : <MasterPage key="/treatments" config={treatmentMasterConfig} />} />
          <Route path="/items" element={hideOperationalMasters ? <Navigate to="/dashboard" replace /> : <MasterPage key="/items" config={itemMasterConfig} />} />
          <Route path="/users" element={isRegularUser || !canViewUsers ? <Navigate to="/dashboard" replace /> : <UsersPage />} />
          <Route path="/roles" element={<Navigate to="/dashboard" replace />} />
          <Route path="/bills" element={<BillsPage key="/bills" />} />
          <Route path="/bill-list" element={<BillsPage key="/bill-list" listOnly />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Routes>
      </main>
    </div>
  );
}

function LoginPage() {
  const { auth, setAuth } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.token) {
      navigate('/dashboard');
    }
  }, [auth.token, navigate]);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', form);
      const { token, user, permissions } = response.data;
      setAuth({ token, user, permissions });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-header">
          <div className="brand-mark login-brand-mark">H</div>
          <h1>HairWigHouse</h1>
          <p>Business Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="card form-card">
          <label>
            <span>Username</span>
            <input name="username" value={form.username} onChange={handleChange} placeholder="Enter username" />
          </label>

          <label>
            <span>Password</span>
            <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Enter password" />
          </label>

          {error && <div className="error-box">{error}</div>}

          <button type="submit" disabled={loading} className="primary-btn">
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

function DashboardPage() {
  const { auth, hasAccess } = useAuth();
  const roleCode = getAuthRoleCode(auth.user);
  const hideOperationalMasterLinks = ['USER', 'BRANCH_ADMIN'].includes(roleCode);
  const showUserMasterLink = roleCode !== 'USER'
    && (roleCode === 'BRANCH_ADMIN' || hasAccess('users', 'canView'));
  const [stats, setStats] = useState({ totalBranches: 0, totalUsers: 0, totalBills: 0, totalPayments: 0, monthlyRevenue: 0, pendingCollection: 0 });

  useEffect(() => {
    if (!auth.token) return;
    api.get('/dashboard/stats').then((response) => setStats(response.data)).catch(() => {});
  }, [auth.token]);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of business operations" />

      <div className="stats-grid">
        <StatCard title="Branches" value={stats.totalBranches} />
        <StatCard title="Users" value={stats.totalUsers} />
        <StatCard title="Bills" value={stats.totalBills} />
        <StatCard title="Payments" value={stats.totalPayments} />
        <StatCard title="Revenue" value={`₹${stats.monthlyRevenue.toLocaleString()}`} />
        <StatCard title="Pending" value={`₹${stats.pendingCollection.toLocaleString()}`} />
      </div>

      <div className="grid-two">
        <div className="card section-card">
          <h3>Access Summary</h3>
          <ul className="list-plain">
            <li><strong>Role:</strong> {auth.user?.RoleName}</li>
            <li><strong>Branch:</strong> {auth.user?.BranchName || 'All branches'}</li>
            <li><strong>Permissions:</strong> {Object.keys(auth.permissions || {}).length}</li>
          </ul>
        </div>

        <div className="card section-card">
          <h3>Quick Access</h3>
          <div className="quick-actions">
            {!hideOperationalMasterLinks && hasAccess('branches', 'canView') && <Link to="/branches">Branch Master</Link>}
            {!hideOperationalMasterLinks && hasAccess('clients', 'canView') && <Link to="/clients">Client Master</Link>}
            {!hideOperationalMasterLinks && hasAccess('brands', 'canView') && <Link to="/brands">Brand Master</Link>}
            {!hideOperationalMasterLinks && hasAccess('units', 'canView') && <Link to="/units">Unit Master</Link>}
            {!hideOperationalMasterLinks && hasAccess('groups', 'canView') && <Link to="/groups">Group Master</Link>}
            {!hideOperationalMasterLinks && hasAccess('treatments', 'canView') && <Link to="/treatments">Treatment Master</Link>}
            {!hideOperationalMasterLinks && hasAccess('items', 'canView') && <Link to="/items">Item Master</Link>}
            {showUserMasterLink && <Link to="/users">User Master</Link>}
            {hasAccess('bills', 'canView') && <Link to="/bills">Bill Management</Link>}
            {hasAccess('payments', 'canView') && <Link to="/payments">Payment Management</Link>}
            {hasAccess('reports', 'canView') && <Link to="/reports">Reports</Link>}
          </div>
        </div>
      </div>
    </div>
  );
}

function BranchesPage() {
  const { hasAccess } = useAuth();
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState(emptyBranch);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [editingBranchId, setEditingBranchId] = useState(null);

  const canAdd = hasAccess('branches', 'canAdd');
  const canEdit = hasAccess('branches', 'canEdit');
  const canDelete = hasAccess('branches', 'canDelete');

  const loadBranches = useCallback(async () => {
    try {
      const response = await api.get('/branches', { params: { search, activeOnly: false } });
      setBranches(response.data);
    } catch (requestError) {
      console.error('Failed loading branches', requestError);
      setError(requestError.response?.data?.message || 'Failed loading branches.');
    }
  }, [search]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      Terms: form.Terms.map((term) => term.trim()).filter(Boolean),
    };
    setError('');
    try {
      if (editingBranchId) {
        await api.put(`/branches/${editingBranchId}`, payload);
      } else {
        await api.post('/branches', payload);
      }
      setForm(emptyBranch);
      setEditingBranchId(null);
      await loadBranches();
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Failed to ${editingBranchId ? 'update' : 'create'} branch.`);
    }
  };

  const handleDelete = async (id) => {
    if (!canDelete) return;
    setError('');
    try {
      await api.delete(`/branches/${id}`);
      await loadBranches();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to deactivate branch.');
    }
  };

  const handleReactivate = async (id) => {
    setError('');
    try {
      await api.patch(`/branches/${id}/activate`);
      await loadBranches();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to activate branch.');
    }
  };

  const handleEdit = (branch) => {
    setEditingBranchId(branch.BranchId);
    setForm({
      BranchCode: branch.BranchCode || '',
      BranchName: branch.BranchName || '',
      Address: branch.Address || '',
      GSTIN: branch.GSTIN || '',
      StateCode: branch.StateCode || '',
      Terms: branch.Terms?.length ? branch.Terms.map((term) => term.TermText) : [''],
    });
    setError('');
  };

  return (
    <div>
      <PageHeader title="Branch Master" subtitle="Manage branch records" />

      {canAdd && (
        <div className="card form-card">
          <h3>{editingBranchId ? 'Edit Branch' : 'Add Branch'}</h3>
          <form onSubmit={handleSubmit} className="grid-form">
            <label>
              <span>Branch Code</span>
              <input value={form.BranchCode} onChange={(e) => setForm({ ...form, BranchCode: e.target.value })} required maxLength={20} />
            </label>
            <label>
              <span>Branch Name</span>
              <input value={form.BranchName} onChange={(e) => setForm({ ...form, BranchName: e.target.value })} required maxLength={120} />
            </label>
            <label className="full-width-field">
              <span>Branch Address</span>
              <textarea value={form.Address} onChange={(e) => setForm({ ...form, Address: e.target.value })} required maxLength={300} />
            </label>
            <label>
              <span>GSTIN</span>
              <input value={form.GSTIN} onChange={(e) => setForm({ ...form, GSTIN: e.target.value.toUpperCase() })} maxLength={30} />
            </label>
            <label>
              <span>State Code</span>
              <input value={form.StateCode} onChange={(e) => setForm({ ...form, StateCode: e.target.value.replace(/\D/g, '').slice(0, 2) })} inputMode="numeric" maxLength={2} />
            </label>
            <div className="branch-terms full-width-field">
              <div className="master-section-heading">
                <h4>Terms &amp; Conditions</h4>
                <button
                  type="button"
                  className="table-btn"
                  onClick={() => setForm({ ...form, Terms: [...form.Terms, ''] })}
                >
                  Add term
                </button>
              </div>
              {form.Terms.map((term, index) => (
                <div className="branch-term-row" key={`term-${index}`}>
                  <textarea
                    aria-label={`Branch term ${index + 1}`}
                    placeholder={`Term ${index + 1}`}
                    value={term}
                    onChange={(event) => {
                      const Terms = [...form.Terms];
                      Terms[index] = event.target.value;
                      setForm({ ...form, Terms });
                    }}
                    required
                    maxLength={1000}
                  />
                  {form.Terms.length > 1 && (
                    <button
                      type="button"
                      className="danger-btn"
                      aria-label={`Remove term ${index + 1}`}
                      onClick={() => setForm({ ...form, Terms: form.Terms.filter((_, termIndex) => termIndex !== index) })}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="master-form-actions full-width-field">
              {editingBranchId && (
                <button
                  type="button"
                  className="table-btn"
                  onClick={() => {
                    setForm(emptyBranch);
                    setEditingBranchId(null);
                    setError('');
                  }}
                >
                  Cancel
                </button>
              )}
              <button type="submit" className="primary-btn">{editingBranchId ? 'Update Branch' : 'Save Branch'}</button>
            </div>
          </form>
          {error && <div className="error-box">{error}</div>}
        </div>
      )}

      {error && !canAdd && <div className="error-box">{error}</div>}
      <div className="card list-card">
        <div className="toolbar">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search branch" />
        </div>

        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Address</th>
              <th>GSTIN</th>
              <th>State Code</th>
              <th>Terms &amp; Conditions</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((branch) => (
              <tr key={branch.BranchId || branch.BranchCode}>
                <td>{branch.BranchCode}</td>
                <td>{branch.BranchName}</td>
                <td>{branch.Address}</td>
                <td>{branch.GSTIN || '—'}</td>
                <td>{branch.StateCode || '—'}</td>
                <td>
                  {branch.Terms?.length ? (
                    <details>
                      <summary>{branch.Terms.length} term(s)</summary>
                      <ol>{branch.Terms.map((term, index) => <li key={term.TermId || index}>{term.TermText}</li>)}</ol>
                    </details>
                  ) : 'None'}
                </td>
                <td>{branch.IsActive ? 'Active' : 'Inactive'}</td>
                <td>
                  {!branch.IsActive && canEdit && <button className="table-btn" type="button" onClick={() => handleReactivate(branch.BranchId)}>Activate</button>}
                  {branch.IsActive && canEdit && <button className="table-btn" type="button" onClick={() => handleEdit(branch)}>Edit</button>}
                  {branch.IsActive && canDelete && <button className="danger-btn" type="button" onClick={() => handleDelete(branch.BranchId)}>Delete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/*
      {viewingBill && <div className="modal-backdrop" role="presentation" onClick={() => setViewingBill(null)}>
        <section className="card bill-modal" role="dialog" aria-modal="true" aria-labelledby="bill-view-title" onClick={(event) => event.stopPropagation()}>
          <div className="sale-section-heading"><h3 id="bill-view-title">Bill {viewingBill.BillNumber}</h3><button type="button" className="table-btn" onClick={() => setViewingBill(null)}>Close</button></div>
          <p>{viewingBill.CustomerName} · {viewingBill.CustomerMobile} · {String(viewingBill.BillDate || '').slice(0, 10)}</p><p>{viewingBill.CustomerAddress}</p>
          <h4>Treatments</h4><table><thead><tr><th>Treatment</th><th>Staff</th><th>Price</th></tr></thead><tbody>{viewingBill.Treatments?.map((row, index) => <tr key={`${row.TreatmentId}-${index}`}><td>{row.TreatmentName}</td><td>{row.StaffName}</td><td>{formatINR(row.Price)}</td></tr>)}</tbody></table>
          <h4>Items</h4><table><thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Amount</th></tr></thead><tbody>{viewingBill.Items?.map((row, index) => <tr key={`${row.ItemId}-${index}`}><td>{row.ItemName}</td><td>{row.Quantity}</td><td>{row.Unit}</td><td>{formatINR(row.LineTotal)}</td></tr>)}</tbody></table>
          <p><strong>Mode:</strong> {viewingBill.PaymentMode} <strong>Total:</strong> {formatINR(viewingBill.NetAmount)}</p>
        </section>
      </div>}
      {editingBill && <div className="modal-backdrop" role="presentation" onClick={() => setEditingBill(null)}>
        <section className="card bill-modal" role="dialog" aria-modal="true" aria-labelledby="bill-edit-title" onClick={(event) => event.stopPropagation()}>
          <h3 id="bill-edit-title">Edit Bill {editingBill.BillNumber}</h3>
          <p>Customer, bill date, and payment mode can be changed here. Billed line items and total remain as originally saved.</p>
          <form className="grid-form" onSubmit={saveBillEdit}>
            <label><span>Client name</span><input required maxLength={160} value={editingBill.CustomerName || ''} onChange={(event) => setEditingBill({ ...editingBill, CustomerName: event.target.value })} /></label>
            <label><span>Mobile</span><input required maxLength={30} value={editingBill.CustomerMobile || ''} onChange={(event) => setEditingBill({ ...editingBill, CustomerMobile: event.target.value })} /></label>
            <label className="full-width-field"><span>Address</span><textarea required maxLength={400} value={editingBill.CustomerAddress || ''} onChange={(event) => setEditingBill({ ...editingBill, CustomerAddress: event.target.value })} /></label>
            <label><span>Email</span><input type="email" maxLength={254} value={editingBill.CustomerEmail || ''} onChange={(event) => setEditingBill({ ...editingBill, CustomerEmail: event.target.value })} /></label>
            <label><span>Bill date</span><input type="date" required value={String(editingBill.BillDate || '').slice(0, 10)} onChange={(event) => setEditingBill({ ...editingBill, BillDate: event.target.value })} /></label>
            <label><span>Payment mode</span><select value={editingBill.PaymentMode || 'Cash'} onChange={(event) => setEditingBill({ ...editingBill, PaymentMode: event.target.value })}><option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option><option>MIX</option></select></label>
            <div className="master-form-actions full-width-field"><button type="button" className="table-btn" onClick={() => setEditingBill(null)}>Cancel</button><button type="submit" className="primary-btn">Save changes</button></div>
          </form>
        </section>
      </div>}
      {printBill && <section className="bill-print-sheet">
        <h1>HairWigHouse</h1><h2>Sale Bill {printBill.BillNumber}</h2><p>{printBill.BranchName} · {String(printBill.BillDate || '').slice(0, 10)}</p>
        <h3>{printBill.CustomerName}</h3><p>{printBill.CustomerMobile} · {printBill.CustomerAddress}</p>
        <table><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>
          {printBill.Treatments?.filter((row) => row.IsPrinted).map((row, index) => <tr key={`pt-${index}`}><td>{row.TreatmentName}</td><td>1</td><td>{formatINR(row.Price)}</td><td>{formatINR(row.Price)}</td></tr>)}
          {printBill.Items?.map((row, index) => <tr key={`pi-${index}`}><td>{row.ItemName}</td><td>—</td><td>{row.Quantity} {row.Unit}</td><td>{formatINR(row.Rate)}</td><td>{formatINR(row.LineTotal)}</td></tr>)}
        </tbody></table><p><strong>Payment mode:</strong> {printBill.PaymentMode}</p><h2>Total: {formatINR(printBill.NetAmount)}</h2>
        <section className="bill-print-terms"><h3>Terms &amp; Conditions</h3><ol>{printBill.Terms?.map((term, index) => <li key={term.TermId || term.TermText || index}>{typeof term === 'string' ? term : term.TermText}</li>)}</ol></section>
      </section>}
      */}
    </div>
  );
}

const clientMasterConfig = {
  idField: 'ClientId',
  module: 'clients',
  endpoint: '/clients',
  title: 'Client Master',
  subtitle: 'Maintain client contact and tax details',
  emptyForm: emptyClient,
  fields: [
    { name: 'ClientName', label: 'Client Name', required: true, maxLength: 180 },
    { name: 'Address', label: 'Address', required: true, multiline: true, maxLength: 500 },
    { name: 'ContactNo', label: 'Contact No', required: true, maxLength: 30 },
    { name: 'Email', label: 'Email ID', type: 'email', maxLength: 254 },
    { name: 'ClientPan', label: 'Client PAN', maxLength: 20 },
    { name: 'ClientCst', label: 'Client CST', maxLength: 30 },
  ],
  columns: [
    { key: 'ClientName', label: 'Client Name' },
    { key: 'Address', label: 'Address' },
    { key: 'ContactNo', label: 'Contact No' },
    { key: 'Email', label: 'Email' },
  ],
};

const treatmentMasterConfig = {
  idField: 'TreatmentId',
  module: 'treatments',
  endpoint: '/treatments',
  title: 'Treatment Master',
  subtitle: 'Maintain treatment prices and tax details',
  emptyForm: emptyTreatment,
  fields: [
    { name: 'TreatmentName', label: 'Treatment', required: true, maxLength: 180 },
    { name: 'AliasName', label: 'Alias Name', required: true, maxLength: 180 },
    { name: 'HSNCode', label: 'HSN Code', maxLength: 20 },
    { name: 'TaxRate', label: 'Tax Rate (%)', type: 'number', required: true, min: 0, step: '0.01' },
    { name: 'TotalPrice', label: 'Total Price (including GST)', type: 'number', required: true, min: 0, step: '0.01' },
    { name: 'TreatmentType', label: 'Treatment Type', required: true, options: ['Bill', 'Query'] },
    { name: 'ProductType', label: 'Product Type', required: true, options: ['Service', 'Product'] },
  ],
  columns: [
    { key: 'TreatmentName', label: 'Treatment' },
    { key: 'AliasName', label: 'Alias Name' },
    { key: 'HSNCode', label: 'HSN Code' },
    { key: 'TotalPrice', label: 'Total Price', currency: true },
    { key: 'TreatmentType', label: 'Treatment Type' },
  ],
};

const brandMasterConfig = {
  idField: 'BrandId',
  module: 'brands',
  endpoint: '/brands',
  title: 'Brand Master',
  subtitle: 'Maintain item brands',
  emptyForm: emptyBrand,
  fields: [
    { name: 'BrandName', label: 'Brand Name', required: true, maxLength: 120 },
  ],
  columns: [
    { key: 'BrandName', label: 'Brand Name' },
  ],
};

const unitMasterConfig = {
  idField: 'UnitId',
  module: 'units',
  endpoint: '/units',
  title: 'Unit Master',
  subtitle: 'Maintain item units',
  emptyForm: emptyUnit,
  fields: [
    { name: 'UnitName', label: 'Unit Name', required: true, maxLength: 30 },
  ],
  columns: [
    { key: 'UnitName', label: 'Unit Name' },
  ],
};

const groupMasterConfig = {
  idField: 'GroupId',
  module: 'groups',
  endpoint: '/groups',
  title: 'Group Master',
  subtitle: 'Maintain item groups',
  emptyForm: emptyGroup,
  fields: [
    { name: 'GroupName', label: 'Group Name', required: true, maxLength: 120 },
  ],
  columns: [
    { key: 'GroupName', label: 'Group Name' },
  ],
};

const itemMasterConfig = {
  idField: 'ItemId',
  module: 'items',
  endpoint: '/items',
  title: 'Item Master',
  subtitle: 'Maintain item, stock and tax details',
  emptyForm: emptyItem,
  fields: [
    { name: 'ItemName', label: 'Item Name', required: true, maxLength: 180 },
    {
      name: 'Brand',
      label: 'Brand',
      required: true,
      optionsEndpoint: '/brands',
      optionValue: 'BrandName',
      optionLabel: 'BrandName',
    },
    {
      name: 'Unit',
      label: 'Unit',
      required: true,
      optionsEndpoint: '/units',
      optionValue: 'UnitName',
      optionLabel: 'UnitName',
    },
    {
      name: 'GroupName',
      label: 'Group',
      required: true,
      optionsEndpoint: '/groups',
      optionValue: 'GroupName',
      optionLabel: 'GroupName',
    },
    { name: 'TotalPrice', label: 'Total Price (including GST)', type: 'number', required: true, min: 0, step: '0.01' },
    { name: 'OpeningStock', label: 'Opening Stock', type: 'number', required: true, min: 0, step: '0.001' },
    { name: 'TaxRate', label: 'Tax Rate (%)', type: 'number', required: true, min: 0, step: '0.01' },
  ],
  columns: [
    { key: 'ItemName', label: 'Item Name' },
    { key: 'Brand', label: 'Brand' },
    { key: 'GroupName', label: 'Group' },
    { key: 'Unit', label: 'Unit' },
    { key: 'OpeningStock', label: 'Opening Stock' },
    { key: 'TotalPrice', label: 'Total Price', currency: true },
  ],
};

function MasterPage({ config }) {
  const { hasAccess } = useAuth();
  const [records, setRecords] = useState([]);
  const [dropdownOptions, setDropdownOptions] = useState({});
  const [form, setForm] = useState(config.emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const canAdd = hasAccess(config.module, 'canAdd');
  const canEdit = hasAccess(config.module, 'canEdit');
  const canDelete = hasAccess(config.module, 'canDelete');

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    const optionFields = config.fields.filter((field) => field.optionsEndpoint);
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const responses = await Promise.all([
          api.get(config.endpoint, { timeout: 15000 }),
          ...optionFields.map((field) => api.get(field.optionsEndpoint, { timeout: 15000 })),
        ]);
        const data = responses[0].data;
        if (!Array.isArray(data)) throw new Error('The server returned an invalid records response.');
        setRecords(data);
        setDropdownOptions(Object.fromEntries(optionFields.map((field, index) => [
          field.optionsEndpoint,
          (Array.isArray(responses[index + 1].data) ? responses[index + 1].data : [])
            .filter((option) => option.IsActive),
        ])));
        setLoading(false);
        return true;
      } catch (requestError) {
        lastError = requestError;
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
    console.error(`Failed loading ${config.title}`, lastError);
    setError(lastError.response?.data?.message || `Could not load ${config.title.toLowerCase()}. Check the server connection and retry.`);
    setLoading(false);
    return false;
  }, [config.endpoint, config.fields, config.title]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const payload = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [
        key,
        typeof value === 'string' ? value.trim() : value,
      ]),
    );

    try {
      if (editingId) {
        await api.put(`${config.endpoint}/${editingId}`, payload);
      } else {
        await api.post(config.endpoint, payload);
      }
      setForm(config.emptyForm);
      setEditingId(null);
      await loadRecords();
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Failed to ${editingId ? 'update' : 'create'} record.`);
    }
  };

  const handleDelete = async (record) => {
    if (!canDelete || !window.confirm(`Deactivate "${record[config.fields[0].name]}"?`)) return;
    setError('');
    try {
      await api.delete(`${config.endpoint}/${record[config.idField]}`);
      await loadRecords();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to deactivate record.');
    }
  };

  const handleReactivate = async (record) => {
    if (!canEdit) return;
    setError('');
    try {
      await api.patch(`${config.endpoint}/${record[config.idField]}/activate`);
      await loadRecords();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to reactivate record.');
    }
  };

  return (
    <div>
      <PageHeader title={config.title} subtitle={config.subtitle} />
      {error && <div className="error-box" role="alert">{error} <button type="button" className="table-btn" onClick={loadRecords}>Retry</button></div>}
      {(canAdd || editingId) && (
        <div className="card form-card">
          <h3>{editingId ? `Edit ${config.title.replace(' Master', '')}` : `Add ${config.title.replace(' Master', '')}`}</h3>
          <form onSubmit={handleSubmit} className="grid-form">
            {config.fields.map((field) => {
              const Input = field.multiline ? 'textarea' : 'input';
              const options = field.options || dropdownOptions[field.optionsEndpoint] || [];
              const inputProps = {
                value: form[field.name],
                onChange: (event) => setForm({ ...form, [field.name]: event.target.value }),
                required: Boolean(field.required),
              };
              return (
                <label key={field.name} className={field.multiline ? 'full-width-field' : ''}>
                  <span>{field.label}</span>
                  {field.options || field.optionsEndpoint ? (
                    <select {...inputProps}>
                      <option value="">Select {field.label}</option>
                      {options.map((option) => {
                        const value = field.optionsEndpoint ? option[field.optionValue] : option;
                        const label = field.optionsEndpoint ? option[field.optionLabel] : option;
                        return <option key={value} value={value}>{label}</option>;
                      })}
                    </select>
                  ) : (
                    <Input
                      {...inputProps}
                      type={field.type || 'text'}
                      maxLength={field.maxLength}
                      min={field.min}
                      step={field.step}
                    />
                  )}
                </label>
              );
            })}
            <div className="master-form-actions full-width-field">
              {editingId && (
                <button
                  type="button"
                  className="table-btn"
                  onClick={() => {
                    setForm(config.emptyForm);
                    setEditingId(null);
                    setError('');
                  }}
                >
                  Cancel
                </button>
              )}
              <button type="submit" className="primary-btn">{editingId ? 'Update' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}
      <div className="card list-card master-table-card">
        <table>
          <thead>
            <tr>
              {config.columns.map((column) => <th key={column.key}>{column.label}</th>)}
              <th>Status</th>
              {(canEdit || canDelete) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={config.columns.length + 1 + (canEdit || canDelete ? 1 : 0)}>Loading records…</td></tr>}
            {!loading && !error && records.length === 0 && <tr><td colSpan={config.columns.length + 1 + (canEdit || canDelete ? 1 : 0)}>No records found.</td></tr>}
            {records.map((record) => (
              <tr key={record[config.idField]}>
                {config.columns.map((column) => (
                  <td key={column.key}>
                    {column.currency ? `₹${Number(record[column.key] || 0).toLocaleString()}` : record[column.key]}
                  </td>
                ))}
                <td>{record.IsActive ? 'Active' : 'Inactive'}</td>
                {(canEdit || canDelete) && (
                  <td>
                    {!record.IsActive && canEdit && <button type="button" className="table-btn" onClick={() => handleReactivate(record)}>Activate</button>}
                    {record.IsActive && canEdit && (
                      <button
                        type="button"
                        className="table-btn"
                        onClick={() => {
                          setForm(Object.fromEntries(config.fields.map((field) => [field.name, record[field.name] ?? ''])));
                          setEditingId(record[config.idField]);
                          setError('');
                        }}
                      >
                        Edit
                      </button>
                    )}
                    {record.IsActive && canDelete && <button type="button" className="danger-btn" onClick={() => handleDelete(record)}>Delete</button>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersPage() {
  const { auth, hasAccess } = useAuth();
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [form, setForm] = useState(emptyUser);
  const [error, setError] = useState('');
  const [editingUserId, setEditingUserId] = useState(null);

  const isBranchAdmin = getAuthRoleCode(auth.user) === 'BRANCH_ADMIN';
  const canAdd = isBranchAdmin || hasAccess('users', 'canAdd');
  const canEdit = hasAccess('users', 'canEdit');
  const canDelete = hasAccess('users', 'canDelete');

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed loading users', error);
      setError(error.response?.data?.message || 'Failed loading users.');
    }
  };

  const loadBranches = async () => {
    try {
      const response = await api.get('/branches', { params: { activeOnly: true } });
      setBranches(response.data);
    } catch (error) {
      console.error('Failed loading branches for user form', error);
    }
  };

  const loadAssignableRoles = async () => {
    try {
      const response = await api.get('/user-roles');
      setAvailableRoles(response.data);
    } catch (requestError) {
      console.error('Failed loading roles for user form', requestError);
      setError(requestError.response?.data?.message || 'Failed loading roles for user form.');
    }
  };

  useEffect(() => {
    loadUsers();
    loadBranches();
    if (canAdd) loadAssignableRoles();
  }, [canAdd]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      if (editingUserId) {
        await api.put(`/users/${editingUserId}`, form);
      } else {
        await api.post('/users', form);
      }
      setForm(emptyUser);
      setEditingUserId(null);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Failed to ${editingUserId ? 'update' : 'create'} user.`);
    }
  };

  const handleEdit = (user) => {
    const assignedRole = availableRoles.find((role) => role.RoleCode === user.RoleCode)
      || availableRoles.find((role) => role.RoleName === user.RoleName);
    const roleName = assignedRole?.RoleName || user.RoleName || 'User';

    setEditingUserId(user.UserId);
    setForm({
      FullName: user.FullName || '',
      Username: user.Username || '',
      Password: '',
      Email: user.Email || '',
      Mobile: user.Mobile || '',
      RoleName: roleName,
      RoleCode: assignedRole?.RoleCode || user.RoleCode || 'USER',
      BranchId: assignedRole?.RoleCode === 'SUPER_ADMIN' ? '' : user.BranchId || '',
    });
    setError('');
  };

  const handleDelete = async (user) => {
    if (!canDelete || !window.confirm(`Deactivate user "${user.Username}"? Their existing records will be kept.`)) {
      return;
    }

    setError('');
    try {
      await api.delete(`/users/${user.UserId}`);
      if (editingUserId === user.UserId) {
        setForm(emptyUser);
        setEditingUserId(null);
      }
      await loadUsers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to delete user.');
    }
  };

  const selectedRole = availableRoles.find((role) => role.RoleCode === form.RoleCode);
  const isSuperAdminRole = selectedRole?.RoleCode === 'SUPER_ADMIN';

  return (
    <div>
      <PageHeader title="User Master" subtitle="Manage users and access" />
      {error && <div className="error-box">{error}</div>}

      {canAdd && (
        <div className="card form-card">
          <h3>{editingUserId ? 'Edit User' : 'Add User'}</h3>
          <form onSubmit={handleSubmit} className="grid-form">
            <input placeholder="Full Name" value={form.FullName} onChange={(e) => setForm({ ...form, FullName: e.target.value })} required />
            <input placeholder="Username" value={form.Username} onChange={(e) => setForm({ ...form, Username: e.target.value })} required disabled={Boolean(editingUserId)} autoComplete="username" />
            <input
              type="password"
              placeholder={editingUserId ? 'New password (optional)' : 'Password'}
              value={form.Password}
              onChange={(e) => setForm({ ...form, Password: e.target.value })}
              required={!editingUserId}
            />
            <input type="email" placeholder="Email" value={form.Email} onChange={(e) => setForm({ ...form, Email: e.target.value })} required autoComplete="email" />
            <input type="tel" placeholder="Mobile" value={form.Mobile} onChange={(e) => setForm({ ...form, Mobile: e.target.value })} required maxLength={60} autoComplete="tel" />
            <select
              value={form.RoleCode}
              onChange={(e) => {
                const role = availableRoles.find((item) => item.RoleCode === e.target.value);
                setForm({
                  ...form,
                  RoleName: role?.RoleName || '',
                  RoleCode: role?.RoleCode || '',
                  BranchId: role?.RoleCode === 'SUPER_ADMIN' ? '' : form.BranchId,
                });
              }}
            >
              {availableRoles.map((role) => (
                <option key={role.RoleId} value={role.RoleCode}>{role.RoleName}</option>
              ))}
            </select>
            <select
              value={isSuperAdminRole ? '' : form.BranchId}
              onChange={(e) => setForm({ ...form, BranchId: e.target.value })}
              disabled={isSuperAdminRole}
              required={!isSuperAdminRole}
            >
              <option value="">Select branch</option>
              {branches.map((branch) => (
                <option key={branch.BranchId} value={branch.BranchId}>
                  {branch.BranchName} ({branch.BranchCode})
                </option>
              ))}
            </select>
            <button type="submit" className="primary-btn">{editingUserId ? 'Update User' : 'Save User'}</button>
            {editingUserId && (
              <button
                type="button"
                className="table-btn"
                onClick={() => {
                  setForm(emptyUser);
                  setEditingUserId(null);
                  setError('');
                }}
              >
                Cancel
              </button>
            )}
          </form>
        </div>
      )}

      <div className="card list-card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Branch</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.UserId || user.Username}>
                <td>{user.FullName}</td>
                <td>{user.Username}</td>
                <td>{user.RoleName}</td>
                <td>{user.BranchName || 'N/A'}</td>
                <td>
                  {canEdit && <button className="table-btn" type="button" onClick={() => handleEdit(user)}>Edit</button>}
                  {canDelete && <button className="danger-btn" type="button" onClick={() => handleDelete(user)}>Delete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BillsPage({ listOnly = false }) {
  const { auth, hasAccess } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [branches, setBranches] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ ...emptyBill, BranchId: auth.user?.BranchId || '' });
  const [treatmentRows, setTreatmentRows] = useState([{ TreatmentId: '', StaffName: '', TaxRate: 0, GSTAmount: 0, Price: 0, IsPrinted: false }]);
  const [itemRows, setItemRows] = useState([{ ItemId: '', Quantity: 1, Rate: '', Remarks: '' }]);
  const [paymentRows, setPaymentRows] = useState([{ PaymentMode: 'Cash', Amount: '' }]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [billListError, setBillListError] = useState('');
  const [billFilters, setBillFilters] = useState({ fromDate: '', toDate: '', paymentMode: '' });
  const [billColumnFilters, setBillColumnFilters] = useState({});
  const [viewingBill, setViewingBill] = useState(null);
  const [editingBill, setEditingBill] = useState(null);
  const [printBill, setPrintBill] = useState(null);
  const [saving, setSaving] = useState(false);
  const [billNumberPreview, setBillNumberPreview] = useState({ key: '', value: '', error: '' });
  const [billNumberPreviewRefresh, setBillNumberPreviewRefresh] = useState(0);
  const [clientLookupStatus, setClientLookupStatus] = useState({ type: '', message: '' });
  const [previousBalance, setPreviousBalance] = useState(0);
  const autofilledClientRef = useRef(null);
  const selectedBranch = branches.find((branch) => String(branch.BranchId) === String(form.BranchId));

  const loadBills = useCallback(async () => {
    try {
      const params = listOnly ? billFilters : {};
      const response = await api.get('/bills', { params });
      setBills(response.data);
      setBillListError('');
    } catch (requestError) {
      console.error('Failed loading bills', requestError);
      setBillListError(requestError.response?.data?.message || 'Failed loading bills.');
    }
  }, [billFilters, listOnly]);

  const visibleBills = useMemo(() => {
    if (!listOnly) return bills;
    const matches = (value, filter) => String(value ?? '').toLowerCase().includes(String(filter || '').trim().toLowerCase());
    return bills.filter((bill) => {
      const total = Number(bill.NetAmount ?? bill.GrandTotal ?? 0);
      const paid = Number(bill.PaidAmount || 0);
      return matches(bill.BillNumber, billColumnFilters.billNumber)
        && matches(bill.CustomerName, billColumnFilters.client)
        && matches(bill.CustomerMobile, billColumnFilters.mobile)
        && matches(String(bill.BillDate || '').slice(0, 10), billColumnFilters.date)
        && matches(bill.BranchName || 'Head Office', billColumnFilters.branch)
        && matches(bill.PaymentDetails || bill.PaymentMode, billColumnFilters.payment)
        && matches(total.toFixed(2), billColumnFilters.total)
        && matches(paid.toFixed(2), billColumnFilters.paid)
        && matches(Math.max(0, total - paid).toFixed(2), billColumnFilters.balance);
    });
  }, [billColumnFilters, bills, listOnly]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  useEffect(() => {
    let active = true;
    const loadSaleOptions = async () => {
      try {
        const [treatmentResponse, itemResponse] = await Promise.all([
          api.get('/treatments'),
          api.get('/items'),
        ]);
        if (!active) return;
        setTreatments(treatmentResponse.data.filter((treatment) => treatment.IsActive));
        setItems(itemResponse.data.filter((item) => item.IsActive));
      } catch (requestError) {
        if (active) {
          console.error('Failed loading sale options', requestError);
          setError(requestError.response?.data?.message || 'Failed loading sale options.');
        }
      }

      if (active && hasAccess('branches', 'canView')) {
        try {
          const branchResponse = await api.get('/branches', { params: { activeOnly: true } });
          if (!active) return;
          setBranches(branchResponse.data);
          setForm((current) => ({
            ...current,
            BranchId: current.BranchId || auth.user?.BranchId || branchResponse.data[0]?.BranchId || '',
          }));
        } catch (requestError) {
          if (active) {
            console.error('Failed loading branches for sale', requestError);
            setError(requestError.response?.data?.message || 'Failed loading branches for sale.');
          }
        }
      }
    };
    loadSaleOptions();
    return () => {
      active = false;
    };
  }, [auth.user?.BranchId, hasAccess]);

  useEffect(() => {
    const key = `${form.BranchId}|${form.BillDate}`;
    if (!form.BranchId || !form.BillDate) return undefined;

    let active = true;
    api.get('/bills/number-preview', {
      params: { branchId: form.BranchId, billDate: form.BillDate },
    }).then((response) => {
      if (active) {
        setBillNumberPreview({ key, value: response.data.BillNumber, error: '' });
        setError((current) => (
          current === 'The generated bill number already exists. Try saving again.' ? '' : current
        ));
      }
    }).catch((requestError) => {
      console.error('Failed loading bill number preview', requestError);
      if (active) {
        setBillNumberPreview({
          key,
          value: '',
          error: requestError.response?.data?.message || 'Could not load the bill number preview.',
        });
      }
    });

    return () => {
      active = false;
    };
  }, [form.BranchId, form.BillDate, billNumberPreviewRefresh]);

  const currentBillPreviewKey = `${form.BranchId}|${form.BillDate}`;
  const currentBillNumberPreview = billNumberPreview.key === currentBillPreviewKey
    ? billNumberPreview.value
    : '';
  const currentBillNumberPreviewError = billNumberPreview.key === currentBillPreviewKey
    ? billNumberPreview.error
    : '';

  useEffect(() => {
    const contactNo = form.CustomerMobile.trim();
    if (!contactNo || editingBill) return undefined;

    let active = true;
    const timeoutId = setTimeout(async () => {
      setClientLookupStatus({ type: 'loading', message: 'Looking up client...' });
      try {
        const response = await api.get('/clients/lookup', { params: { contactNo } });
        if (!active) return;
        if (!response.data) {
          setPreviousBalance(0);
          setClientLookupStatus({ type: 'not-found', message: 'Client is not in Client Master. You can still save this bill with the details entered here.' });
          return;
        }

        const client = response.data;
        setPreviousBalance(Number(client.PreviousBalance || 0));
        setForm((current) => {
          if (current.CustomerMobile.trim() !== contactNo) return current;
          autofilledClientRef.current = {
            ContactNo: contactNo,
            CustomerName: client.ClientName,
            CustomerAddress: client.Address,
            CustomerEmail: client.Email || '',
          };
          return {
            ...current,
            CustomerName: client.ClientName,
            CustomerAddress: client.Address,
            CustomerEmail: client.Email || '',
          };
        });
        setClientLookupStatus({ type: 'found', message: 'Client details filled from Client Master.' });
      } catch (requestError) {
        if (!active) return;
        setPreviousBalance(0);
        setClientLookupStatus({
          type: 'error',
          message: requestError.response?.data?.message || 'Could not look up client details.',
        });
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [form.CustomerMobile, editingBill]);

  const handleClientContactChange = (contactNo) => {
    const previousClient = autofilledClientRef.current;
    autofilledClientRef.current = null;
    if (!editingBill) setPreviousBalance(0);
    setClientLookupStatus({ type: '', message: '' });
    setForm((current) => ({
      ...current,
      CustomerMobile: contactNo,
      CustomerName: previousClient && current.CustomerName === previousClient.CustomerName
        ? ''
        : current.CustomerName,
      CustomerAddress: previousClient && current.CustomerAddress === previousClient.CustomerAddress
        ? ''
        : current.CustomerAddress,
      CustomerEmail: previousClient && current.CustomerEmail === previousClient.CustomerEmail
        ? ''
        : current.CustomerEmail,
    }));
  };

  const treatmentTotal = treatmentRows.reduce((total, row) => total + Number(row.Price || 0), 0);
  const treatmentTax = treatmentRows.reduce((total, row) => (
    total + Number(row.GSTAmount || 0)
  ), 0);
  const itemTotal = itemRows.reduce((total, row) => {
    const item = items.find((option) => String(option.ItemId) === String(row.ItemId));
    return total + (row.ItemId ? Number(row.Rate ?? item?.TotalPrice ?? 0) * Number(row.Quantity || 0) : 0);
  }, 0);
  const itemTax = itemRows.reduce((total, row) => {
    const item = items.find((option) => String(option.ItemId) === String(row.ItemId));
    return total + (row.ItemId
      ? calculateInclusiveTax(Number(row.Rate ?? item?.TotalPrice ?? 0) * Number(row.Quantity || 0), Number(row.TaxRate ?? item?.TaxRate ?? 0))
      : 0);
  }, 0);
  const grossTotal = treatmentTotal + itemTotal;
  const gstTotal = treatmentTax + itemTax;
  const grandTotal = grossTotal + previousBalance;
  const paidTotal = paymentRows.reduce((total, row) => total + Number(row.Amount || 0), 0);
  const balanceDue = Math.max(0, grandTotal - paidTotal);

  const handleTreatmentChange = (index, treatmentId) => {
    const selected = treatments.find((treatment) => String(treatment.TreatmentId) === treatmentId);
    const price = Number(selected?.TotalPrice || 0);
    const taxRate = Number(selected?.TaxRate || 0);
    setTreatmentRows((current) => current.map((row, rowIndex) => (
      rowIndex === index
        ? {
          ...row,
          TreatmentId: treatmentId,
          HSNCode: selected?.HSNCode || '',
          TaxRate: taxRate,
          GSTAmount: calculateInclusiveTax(price, taxRate),
          Price: price,
        }
        : row
    )));
  };

  const handleItemChange = (index, itemId) => {
    const selected = items.find((item) => String(item.ItemId) === itemId);
    setItemRows((current) => current.map((row, rowIndex) => (
      rowIndex === index ? { ...row, ItemId: itemId, Rate: selected?.TotalPrice ?? '' } : row
    )));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    const normalizedPayments = paymentRows
      .map((row, index) => ({
        PaymentMode: row.PaymentMode,
        Amount: Number(row.Amount || (!editingBill && index === 0 && paymentRows.length === 1 ? grandTotal : 0)),
      }))
      .filter((row) => row.Amount > 0);
    if (normalizedPayments.reduce((sum, row) => sum + row.Amount, 0) > grandTotal + 0.01) {
      setError('Payment amounts cannot exceed the bill total.');
      setSaving(false);
      return;
    }
    const payload = {
      ...form,
      PaymentMode: normalizedPayments.length > 1 ? 'MIX' : (normalizedPayments[0]?.PaymentMode || form.PaymentMode || 'Cash'),
      Payments: normalizedPayments,
      CustomerEmail: String(form.CustomerEmail || '').trim(),
      Treatments: treatmentRows.filter((row) => row.TreatmentId).map(({ TreatmentId, StaffName, IsPrinted, Price, GSTAmount }) => ({
        TreatmentId,
        StaffName,
        IsPrinted,
        Price: Number(Price),
        GSTAmount: Number(GSTAmount),
      })),
      Items: itemRows.filter((row) => row.ItemId).map(({ ItemId, Quantity, Rate, Remarks }) => ({
        ItemId,
        Quantity: Number(Quantity),
        Rate: Number(Rate || 0),
        Remarks,
      })),
    };
    try {
      const response = editingBill
        ? await api.put(`/bills/${editingBill.SaleBillId}`, payload)
        : await api.post('/bills', payload);
      setSuccess(editingBill
        ? `Bill ${editingBill.BillNumber} updated. Client saved to Client Master.`
        : `Sale bill ${response.data.BillNumber} saved. Client saved to Client Master.`);
      if (!editingBill) setBillNumberPreviewRefresh((current) => current + 1);
      setEditingBill(null);
      autofilledClientRef.current = null;
      setClientLookupStatus({ type: '', message: '' });
      setForm({ ...emptyBill, BranchId: form.BranchId });
      setTreatmentRows([{ TreatmentId: '', StaffName: '', TaxRate: 0, GSTAmount: 0, Price: 0, IsPrinted: false }]);
      setItemRows([{ ItemId: '', Quantity: 1, Rate: '', Remarks: '' }]);
      setPaymentRows([{ PaymentMode: 'Cash', Amount: '' }]);
      setPreviousBalance(0);
      await loadBills();
    } catch (requestError) {
      if (requestError.response?.status === 409) {
        setBillNumberPreviewRefresh((current) => current + 1);
      }
      setError(requestError.response?.data?.message || `Failed to ${editingBill ? 'update' : 'save'} sale bill.`);
    } finally {
      setSaving(false);
    }
  };

  const populateBillForm = useCallback((bill) => {
    const paidAmount = Number(bill.PaidAmount || 0);
    setForm({
      BranchId: bill.BranchId || '',
      CustomerName: bill.CustomerName || '',
      CustomerMobile: bill.CustomerMobile || '',
      CustomerAddress: bill.CustomerAddress || '',
      CustomerEmail: bill.CustomerEmail || '',
      BillDate: String(bill.BillDate || '').slice(0, 10),
      NextServiceDate: String(bill.NextServiceDate || '').slice(0, 10),
      PaymentMode: bill.PaymentMode || 'Cash',
    });
    const loadedPayments = bill.Payments?.length
      ? bill.Payments.map((payment) => ({
        PaymentId: payment.PaymentId,
        PaymentMode: payment.PaymentMode || 'Cash',
        Amount: String(payment.Amount ?? ''),
      }))
      : paidAmount > 0
        ? [{ PaymentMode: bill.PaymentMode === 'MIX' ? 'Cash' : (bill.PaymentMode || 'Cash'), Amount: String(paidAmount) }]
        : [{ PaymentMode: bill.PaymentMode || 'Cash', Amount: '' }];
    setPaymentRows(loadedPayments);
    setPreviousBalance(Number(bill.PreviousBalance || 0));
    setTreatmentRows(bill.Treatments?.length
      ? bill.Treatments.map((row) => ({
        TreatmentId: String(row.TreatmentId),
        TreatmentName: row.TreatmentName || '',
        HSNCode: row.HSNCode || '',
        StaffName: row.StaffName || '',
        TaxRate: Number(row.TaxRate || 0),
        GSTAmount: Number(row.GSTAmount || 0),
        Price: Number(row.Price || 0),
        IsPrinted: Boolean(row.IsPrinted),
      }))
      : [{ TreatmentId: '', StaffName: '', TaxRate: 0, GSTAmount: 0, Price: 0, IsPrinted: false }]);
    setItemRows(bill.Items?.length
      ? bill.Items.map((row) => ({
        ItemId: String(row.ItemId),
        ItemName: row.ItemName || '',
        Unit: row.Unit || '',
        TaxRate: Number(row.TaxRate || 0),
        Quantity: Number(row.Quantity || 1),
        Rate: Number(row.Rate || 0),
        Remarks: row.Remarks || '',
      }))
      : [{ ItemId: '', Quantity: 1, Rate: '', Remarks: '' }]);
    setEditingBill({ SaleBillId: bill.SaleBillId, BillNumber: bill.BillNumber });
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const editBillId = location.state?.editBillId;
    if (!editBillId || listOnly) return undefined;
    let active = true;
    api.get(`/bills/${editBillId}`).then((response) => {
      if (active) populateBillForm(response.data);
    }).catch((requestError) => {
      if (active) setBillListError(requestError.response?.data?.message || 'Could not load bill for editing.');
    }).finally(() => {
      if (active) navigate('/bills', { replace: true, state: null });
    });
    return () => { active = false; };
  }, [location.state?.editBillId, listOnly, navigate, populateBillForm]);

  const fetchBillDetail = async (bill, mode) => {
    setBillListError('');
    if (mode === 'edit' && listOnly) {
      navigate('/bills', { state: { editBillId: bill.SaleBillId } });
      return;
    }
    try {
      const response = await api.get(`/bills/${bill.SaleBillId}`);
      if (mode === 'edit') populateBillForm(response.data);
      if (mode === 'view') setViewingBill(response.data);
      if (mode === 'print') setPrintBill(response.data);
    } catch (requestError) {
      setBillListError(requestError.response?.data?.message || 'Could not load bill details.');
    }
  };

  const cancelBillEdit = () => {
    setEditingBill(null);
    setPreviousBalance(0);
    setError('');
    setForm({ ...emptyBill, BranchId: auth.user?.BranchId || branches[0]?.BranchId || '' });
    setTreatmentRows([{ TreatmentId: '', StaffName: '', TaxRate: 0, GSTAmount: 0, Price: 0, IsPrinted: false }]);
    setItemRows([{ ItemId: '', Quantity: 1, Rate: '', Remarks: '' }]);
    setPaymentRows([{ PaymentMode: 'Cash', Amount: '' }]);
  };

  const deleteBill = async (bill) => {
    if (!window.confirm(`Cancel bill ${bill.BillNumber}? Bills with recorded payments cannot be deleted.`)) return;
    setBillListError('');
    try {
      await api.delete(`/bills/${bill.SaleBillId}`);
      await loadBills();
    } catch (requestError) {
      setBillListError(requestError.response?.data?.message || 'Could not cancel bill.');
    }
  };

  useEffect(() => {
    if (!printBill) return undefined;
    const timer = setTimeout(() => window.print(), 100);
    const clearPrintBill = () => setPrintBill(null);
    window.addEventListener('afterprint', clearPrintBill);
    return () => { clearTimeout(timer); window.removeEventListener('afterprint', clearPrintBill); };
  }, [printBill]);

  return (
    <div>
      <PageHeader
        title={listOnly ? 'Bill List' : 'Bills'}
        subtitle={listOnly ? 'Filter and manage bills by date and payment mode' : 'Create sale bills and review bills'}
      />
      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}
      {!listOnly && (hasAccess('bills', 'canAdd') || (editingBill && hasAccess('bills', 'canEdit'))) && (
        <form className="sale-form" onSubmit={handleSubmit}>
          <div className="sale-layout">
            <div className="sale-main">
              <section className="card form-card">
                <div className="sale-section-heading"><h3>{editingBill ? `Edit Bill ${editingBill.BillNumber}` : 'Client & Bill Details'}</h3>{editingBill && <button type="button" className="table-btn" onClick={cancelBillEdit}>Cancel Edit</button>}</div>
                <div className="bill-number-preview" aria-live="polite">
                  <span>Bill No.</span>
                  <strong>
                    {editingBill?.BillNumber || currentBillNumberPreview
                      || (currentBillNumberPreviewError ? 'Unavailable' : form.BranchId ? 'Loading...' : 'Select a branch')}
                  </strong>
                  <small>
                    {currentBillNumberPreviewError || 'Preview only; the final number is confirmed when saved.'}
                  </small>
                </div>
                <div className="sale-header-grid">
                  {hasAccess('branches', 'canView') && (
                    <label>
                      <span>Branch</span>
                      <select value={form.BranchId} onChange={(event) => setForm({ ...form, BranchId: event.target.value })} required>
                        <option value="">Select branch</option>
                        {branches.map((branch) => <option key={branch.BranchId} value={branch.BranchId}>{branch.BranchName}</option>)}
                      </select>
                    </label>
                  )}
                  <label>
                    <span>Branch GSTIN</span>
                    <input value={selectedBranch?.GSTIN || selectedBranch?.GSTNumber || ''} readOnly placeholder="Select a branch" />
                  </label>
                  <label>
                    <span>State Code</span>
                    <input value={selectedBranch?.StateCode || ''} readOnly placeholder="Select a branch" />
                  </label>
                  <label>
                    <span>Contact No</span>
                    <input value={form.CustomerMobile} onChange={(event) => handleClientContactChange(event.target.value)} required maxLength={30} />
                    {clientLookupStatus.message && (
                      <small className={`client-lookup-status ${clientLookupStatus.type}`} role="status">
                        {clientLookupStatus.message}
                      </small>
                    )}
                  </label>
                  <label>
                    <span>Client Name</span>
                    <input value={form.CustomerName} onChange={(event) => setForm({ ...form, CustomerName: event.target.value })} required maxLength={160} />
                  </label>
                  <label>
                    <span>Address</span>
                    <textarea value={form.CustomerAddress} onChange={(event) => setForm({ ...form, CustomerAddress: event.target.value })} required maxLength={400} />
                  </label>
                  <label>
                    <span>E-mail</span>
                    <input type="email" value={form.CustomerEmail} onChange={(event) => setForm({ ...form, CustomerEmail: event.target.value })} onBlur={(event) => setForm((current) => ({ ...current, CustomerEmail: event.target.value.trim() }))} maxLength={254} />
                  </label>
                  <label>
                    <span>Date</span>
                    <input type="date" min="1900-01-01" value={form.BillDate} onChange={(event) => setForm({ ...form, BillDate: event.target.value })} required />
                  </label>
                  <label>
                    <span>Next Service Date</span>
                    <input type="date" value={form.NextServiceDate} onChange={(event) => setForm({ ...form, NextServiceDate: event.target.value })} />
                  </label>
                </div>
              </section>

              <section className="card list-card sale-lines-card">
                <div className="sale-section-heading">
                  <h3>Treatments</h3>
                  <button type="button" className="primary-btn" onClick={() => setTreatmentRows([...treatmentRows, { TreatmentId: '', StaffName: '', TaxRate: 0, GSTAmount: 0, Price: 0, IsPrinted: false }])}>Add Row</button>
                </div>
                <div className="sale-table-scroll">
                  <table className="sale-lines-table treatment-lines-table">
                    <thead>
                      <tr><th>Action</th><th>Treatment Name</th><th>HSN Code</th><th>Staff Name</th><th>GST %</th><th>GST Amount</th><th>Price</th><th>Print</th></tr>
                    </thead>
                    <tbody>
                      {treatmentRows.map((row, index) => (
                        <tr key={`treatment-${index}`}>
                          <td><button type="button" className="danger-btn sale-row-remove-btn" onClick={() => setTreatmentRows(treatmentRows.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remove treatment" title="Remove treatment"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m3 0-.9 14H5.9L5 6m4 4v6m6-6v6" /></svg></button></td>
                          <td>
                            <select value={row.TreatmentId} onChange={(event) => handleTreatmentChange(index, event.target.value)}>
                              <option value="">{treatments.length ? 'Select treatment' : 'No treatments in Treatment Master'}</option>
                              {row.TreatmentId && !treatments.some((treatment) => String(treatment.TreatmentId) === String(row.TreatmentId)) && <option value={row.TreatmentId}>{row.TreatmentName || 'Previously selected treatment'}</option>}
                              {treatments.map((treatment) => <option key={treatment.TreatmentId} value={treatment.TreatmentId}>{treatment.TreatmentName}</option>)}
                            </select>
                          </td>
                          <td>{row.HSNCode || treatments.find((treatment) => String(treatment.TreatmentId) === String(row.TreatmentId))?.HSNCode || '—'}</td>
                          <td><input value={row.StaffName} onChange={(event) => setTreatmentRows(treatmentRows.map((current, rowIndex) => rowIndex === index ? { ...current, StaffName: event.target.value } : current))} maxLength={120} placeholder="Staff name" /></td>
                          <td><input type="number" value={row.TaxRate} readOnly /></td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.GSTAmount}
                              onChange={(event) => setTreatmentRows(treatmentRows.map((current, rowIndex) => (
                                rowIndex === index ? { ...current, GSTAmount: event.target.value } : current
                              )))}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.Price}
                              onChange={(event) => {
                                const price = event.target.value;
                                setTreatmentRows(treatmentRows.map((current, rowIndex) => (
                                  rowIndex === index
                                    ? {
                                      ...current,
                                      Price: price,
                                      GSTAmount: calculateInclusiveTax(Number(price || 0), Number(current.TaxRate || 0)),
                                    }
                                    : current
                                )));
                              }}
                            />
                          </td>
                          <td><input type="checkbox" checked={row.IsPrinted} onChange={(event) => setTreatmentRows(treatmentRows.map((current, rowIndex) => rowIndex === index ? { ...current, IsPrinted: event.target.checked } : current))} aria-label="Print treatment" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="card list-card sale-lines-card">
                <div className="sale-section-heading">
                  <h3>Row Items</h3>
                  <button type="button" className="primary-btn" onClick={() => setItemRows([...itemRows, { ItemId: '', Quantity: 1, Rate: '', Remarks: '' }])}>Add Row</button>
                </div>
                <div className="sale-table-scroll">
                  <table className="sale-lines-table item-lines-table">
                    <thead>
                      <tr><th>Action</th><th>Item Name</th><th>Quantity</th><th>Unit</th><th>Price</th><th>Remarks</th></tr>
                    </thead>
                    <tbody>
                      {itemRows.map((row, index) => {
                        const selectedItem = items.find((item) => String(item.ItemId) === String(row.ItemId));
                        return (
                          <tr key={`item-${index}`}>
                            <td><button type="button" className="danger-btn sale-row-remove-btn" onClick={() => setItemRows(itemRows.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remove item" title="Remove item"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m3 0-.9 14H5.9L5 6m4 4v6m6-6v6" /></svg></button></td>
                            <td>
                              <select value={row.ItemId} onChange={(event) => handleItemChange(index, event.target.value)}>
                                <option value="">{items.length ? 'Select item' : 'No items in Item Master'}</option>
                                {row.ItemId && !items.some((item) => String(item.ItemId) === String(row.ItemId)) && <option value={row.ItemId}>{row.ItemName || 'Previously selected item'}</option>}
                                {items.map((item) => <option key={item.ItemId} value={item.ItemId}>{item.ItemName}</option>)}
                              </select>
                            </td>
                            <td><input type="number" min="0.001" step="0.001" value={row.Quantity} onChange={(event) => setItemRows(itemRows.map((current, rowIndex) => rowIndex === index ? { ...current, Quantity: event.target.value } : current))} /></td>
                            <td>{selectedItem?.Unit || '—'}</td>
                            <td>{selectedItem ? `₹${Number(selectedItem.TotalPrice).toFixed(2)}` : '—'}</td>
                            <td><input value={row.Remarks} onChange={(event) => setItemRows(itemRows.map((current, rowIndex) => rowIndex === index ? { ...current, Remarks: event.target.value } : current))} maxLength={300} placeholder="Remarks" /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <aside className="card section-card sale-summary">
              <h3>Bill Summary</h3>
              {previousBalance > 0 && <div><span>Previous balance</span><strong>{formatINR(previousBalance)}</strong></div>}
              <div><span>Treatments</span><strong>₹{treatmentTotal.toFixed(2)}</strong></div>
              <div><span>Row Items</span><strong>₹{itemTotal.toFixed(2)}</strong></div>
              <div><span>GST included</span><strong>₹{gstTotal.toFixed(2)}</strong></div>
              <div className="sale-grand-total"><span>Total Amount</span><strong>₹{grandTotal.toFixed(2)}</strong></div>
              <div className="payment-breakdown">
                <div className="sale-section-heading"><h3>Payment options</h3><button type="button" className="table-btn" disabled={paymentRows.length >= 3} onClick={() => setPaymentRows((rows) => [...rows, { PaymentMode: 'UPI', Amount: '' }])}>Add method</button></div>
                {paymentRows.map((row, index) => <div className="payment-row" key={`payment-${index}`}>
                  <select aria-label={`Payment method ${index + 1}`} value={row.PaymentMode} onChange={(event) => setPaymentRows((rows) => rows.map((item, rowIndex) => rowIndex === index ? { ...item, PaymentMode: event.target.value } : item))}>
                    <option value="Cash">Cash</option><option value="UPI">UPI</option><option value="Online">Online</option><option value="Card">Card</option><option value="Bank Transfer">Bank Transfer</option>
                  </select>
                  <input aria-label={`Amount by ${row.PaymentMode}`} type="number" min="0" max={grandTotal} step="0.01" placeholder="Amount" value={row.Amount || (!editingBill && paymentRows.length === 1 && index === 0 ? grandTotal : '')} onChange={(event) => setPaymentRows((rows) => rows.map((item, rowIndex) => rowIndex === index ? { ...item, Amount: event.target.value } : item))} />
                  {paymentRows.length > 1 && <button type="button" className="danger-btn" aria-label="Remove payment method" onClick={() => setPaymentRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}>×</button>}
                </div>)}
                <div><span>Paid</span><strong>₹{(!editingBill && !paidTotal && paymentRows.length === 1 ? grandTotal : paidTotal).toFixed(2)}</strong></div>
                <div><span>Balance due</span><strong>₹{Math.max(0, balanceDue - (!editingBill && paymentRows.length === 1 && !paymentRows[0].Amount ? grandTotal : 0)).toFixed(2)}</strong></div>
              </div>
              <button type="submit" className="primary-btn" disabled={saving || !form.BranchId}>
                {saving ? (editingBill ? 'Updating Bill...' : 'Saving Sale...') : (editingBill ? 'Update Bill' : 'Save Sale')}
              </button>
              {!form.BranchId && <small>Select a branch or sign in with a branch assigned to your user.</small>}
            </aside>
          </div>
        </form>
      )}

      <div className={`card list-card${listOnly ? ' bill-list-card' : ''}`}>
        <div className="bill-list-heading"><div><h3>{listOnly ? 'Bill Register' : 'Bills'}</h3>{listOnly && <p>Search each column to narrow the bill list.</p>}</div>{listOnly && <span className="bill-count-pill">{visibleBills.length} bills</span>}</div>
        {listOnly && <div className="bill-filters">
          <label><span>From date</span><input type="date" value={billFilters.fromDate} onChange={(event) => setBillFilters({ ...billFilters, fromDate: event.target.value })} /></label>
          <label><span>To date</span><input type="date" value={billFilters.toDate} onChange={(event) => setBillFilters({ ...billFilters, toDate: event.target.value })} /></label>
          <label><span>Payment mode</span><select value={billFilters.paymentMode} onChange={(event) => setBillFilters({ ...billFilters, paymentMode: event.target.value })}>
            <option value="">All modes</option><option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option><option>MIX</option>
          </select></label>
          <button type="button" className="table-btn" onClick={() => setBillFilters({ fromDate: '', toDate: '', paymentMode: '' })}>Clear filters</button>
        </div>}
        {billListError && <div className="error-box" role="alert">{billListError}</div>}
        <div className="sale-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Bill Number</th><th>Client</th><th>Mobile</th><th>Date</th><th>Branch</th><th>Payment details</th><th>Total</th><th>Paid</th><th>Balance</th><th>Actions</th>
            </tr>
            {listOnly && <tr className="column-filter-row">
              <th><input aria-label="Filter by bill number" placeholder="Bill no." value={billColumnFilters.billNumber || ''} onChange={(event) => setBillColumnFilters({ ...billColumnFilters, billNumber: event.target.value })} /></th>
              <th><input aria-label="Filter by client" placeholder="Client" value={billColumnFilters.client || ''} onChange={(event) => setBillColumnFilters({ ...billColumnFilters, client: event.target.value })} /></th>
              <th><input aria-label="Filter by mobile" placeholder="Mobile" value={billColumnFilters.mobile || ''} onChange={(event) => setBillColumnFilters({ ...billColumnFilters, mobile: event.target.value })} /></th>
              <th><input aria-label="Filter by bill date" type="date" value={billColumnFilters.date || ''} onChange={(event) => setBillColumnFilters({ ...billColumnFilters, date: event.target.value })} /></th>
              <th><input aria-label="Filter by branch" placeholder="Branch" value={billColumnFilters.branch || ''} onChange={(event) => setBillColumnFilters({ ...billColumnFilters, branch: event.target.value })} /></th>
              <th><input aria-label="Filter by payment details" placeholder="Payment" value={billColumnFilters.payment || ''} onChange={(event) => setBillColumnFilters({ ...billColumnFilters, payment: event.target.value })} /></th>
              <th><input aria-label="Filter by total" placeholder="Total" inputMode="decimal" value={billColumnFilters.total || ''} onChange={(event) => setBillColumnFilters({ ...billColumnFilters, total: event.target.value })} /></th>
              <th><input aria-label="Filter by paid amount" placeholder="Paid" inputMode="decimal" value={billColumnFilters.paid || ''} onChange={(event) => setBillColumnFilters({ ...billColumnFilters, paid: event.target.value })} /></th>
              <th><input aria-label="Filter by balance" placeholder="Balance" inputMode="decimal" value={billColumnFilters.balance || ''} onChange={(event) => setBillColumnFilters({ ...billColumnFilters, balance: event.target.value })} /></th>
              <th><button type="button" className="table-btn" onClick={() => setBillColumnFilters({})}>Clear</button></th>
            </tr>}
          </thead>
          <tbody>
            {visibleBills.map((bill) => (
              <tr key={bill.SaleBillId || bill.BillNumber}>
                <td>{bill.BillNumber}</td>
                <td>{bill.CustomerName}</td>
                <td>{bill.CustomerMobile}</td>
                <td>{String(bill.BillDate || '').slice(0, 10)}</td>
                <td>{bill.BranchName || 'Head Office'}</td>
                <td>{bill.PaymentDetails || bill.PaymentMode || '—'}</td>
                <td>{formatINR(bill.NetAmount ?? bill.GrandTotal)}</td>
                <td>{formatINR(bill.PaidAmount)}</td>
                <td>{formatINR(Math.max(0, Number(bill.NetAmount ?? bill.GrandTotal ?? 0) - Number(bill.PaidAmount || 0)))}</td>
                <td className="bill-actions">
                  <button type="button" className="table-btn" onClick={() => fetchBillDetail(bill, 'view')}>View</button>
                  {hasAccess('bills', 'canEdit') && <button type="button" className="table-btn" onClick={() => fetchBillDetail(bill, 'edit')}>Edit</button>}
                  <button type="button" className="table-btn" onClick={() => fetchBillDetail(bill, 'print')}>Print</button>
                  {hasAccess('bills', 'canDelete') && <button type="button" className="danger-btn" onClick={() => deleteBill(bill)}>Delete</button>}
                </td>
              </tr>
            ))}
            {!visibleBills.length && <tr><td colSpan="10">No bills match these filters.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
      {viewingBill && <div className="modal-backdrop" role="presentation" onClick={() => setViewingBill(null)}>
        <section className="bill-view-modal" role="dialog" aria-modal="true" aria-labelledby="bill-view-title" onClick={(event) => event.stopPropagation()}>
          {(() => {
            const total = Number(viewingBill.NetAmount ?? viewingBill.GrandTotal ?? 0);
            const paid = Number(viewingBill.PaidAmount || 0);
            const balance = Math.max(0, total - paid);
            const status = balance <= 0 ? 'Paid' : paid > 0 ? 'Partially paid' : 'Unpaid';
            return <>
              <header className="bill-view-header">
                <div>
                  <span className="bill-view-kicker">SALE BILL</span>
                  <h2 id="bill-view-title">{viewingBill.BillNumber}</h2>
                  <p>{viewingBill.BranchName || 'Branch'} <span>·</span> {String(viewingBill.BillDate || '').slice(0, 10)}</p>
                </div>
                <div className="bill-view-header-actions">
                  <span className={`bill-status-pill ${status === 'Paid' ? 'is-paid' : status === 'Unpaid' ? 'is-unpaid' : 'is-partial'}`}>{status}</span>
                  <button type="button" className="bill-view-close" aria-label="Close bill details" onClick={() => setViewingBill(null)}>×</button>
                </div>
              </header>
              <div className="bill-view-content">
                <div className="bill-view-stats">
                  <div className="bill-view-stat"><span>Bill total</span><strong>{formatINR(total)}</strong></div>
                  <div className="bill-view-stat"><span>Paid</span><strong>{formatINR(paid)}</strong></div>
                  <div className="bill-view-stat bill-view-stat-balance"><span>Balance due</span><strong>{formatINR(balance)}</strong></div>
                </div>

                <section className="bill-view-section">
                  <div className="bill-view-section-title"><span className="bill-view-section-icon">01</span><div><h3>Customer details</h3><p>Billing information</p></div></div>
                  <div className="bill-view-customer-grid">
                    <div><span>Customer</span><strong>{viewingBill.CustomerName || '—'}</strong></div>
                    <div><span>Mobile</span><strong>{viewingBill.CustomerMobile || '—'}</strong></div>
                    <div><span>Address</span><strong>{viewingBill.CustomerAddress || '—'}</strong></div>
                    <div><span>Email</span><strong>{viewingBill.CustomerEmail || '—'}</strong></div>
                  </div>
                </section>

                <section className="bill-view-section">
                  <div className="bill-view-section-title"><span className="bill-view-section-icon">GST</span><div><h3>Branch tax details</h3><p>Seller details from branch master</p></div></div>
                  <div className="bill-view-customer-grid">
                    <div><span>Branch GSTIN</span><strong>{viewingBill.BranchGSTIN || '—'}</strong></div>
                    <div><span>State Code</span><strong>{viewingBill.BranchStateCode || '—'}</strong></div>
                  </div>
                </section>

                <section className="bill-view-section">
                  <div className="bill-view-section-title"><span className="bill-view-section-icon">02</span><div><h3>Bill items</h3><p>{(viewingBill.Treatments?.length || 0) + (viewingBill.Items?.length || 0)} line items</p></div></div>
                  <div className="bill-view-table-wrap">
                    <table className="bill-view-table">
                      <thead><tr><th>Description</th><th>HSN</th><th>Staff / Unit</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
                      <tbody>
                        {viewingBill.Treatments?.map((row, index) => <tr key={`vt-${row.TreatmentId}-${index}`}><td><strong>{row.TreatmentName}</strong><small>Treatment</small></td><td>{row.HSNCode || '—'}</td><td>{row.StaffName || '—'}</td><td>1</td><td>{formatINR(row.Price)}</td><td className="bill-view-amount">{formatINR(row.Price)}</td></tr>)}
                        {viewingBill.Items?.map((row, index) => <tr key={`vi-${row.ItemId}-${index}`}><td><strong>{row.ItemName}</strong><small>Product</small></td><td>—</td><td>{row.Unit || '—'}</td><td>{row.Quantity}</td><td>{formatINR(row.Rate)}</td><td className="bill-view-amount">{formatINR(row.LineTotal ?? row.Amount)}</td></tr>)}
                        {!viewingBill.Treatments?.length && !viewingBill.Items?.length && <tr><td colSpan="6" className="bill-view-empty">No line items found for this bill.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  <div className="bill-view-total-row"><span>Previous balance included</span><strong>{formatINR(viewingBill.PreviousBalance)}</strong></div>
                  <div className="bill-view-total-row bill-view-grand-total"><span>Total bill amount</span><strong>{formatINR(total)}</strong></div>
                </section>

                <section className="bill-view-payment">
                  <div><span className="bill-view-section-icon">03</span><div><h3>Payment summary</h3><p>Payment mode: <strong>{viewingBill.PaymentMode || '—'}</strong></p></div></div>
                  <div className="bill-view-payment-amounts"><span>Paid <strong>{formatINR(paid)}</strong></span><span>Due <strong>{formatINR(balance)}</strong></span></div>
                </section>
                {viewingBill.Terms?.length > 0 && <section className="bill-view-terms"><h3>Terms &amp; conditions</h3><ol>{viewingBill.Terms.map((term, index) => <li key={term.TermId || term.TermText || index}>{typeof term === 'string' ? term : term.TermText}</li>)}</ol></section>}
              </div>
              <footer className="bill-view-footer"><span>Thank you for your business.</span><button type="button" className="primary-btn" onClick={() => setViewingBill(null)}>Done</button></footer>
            </>;
          })()}
        </section>
      </div>}
      {printBill && <section className="bill-print-sheet">
        <h1>HairWigHouse</h1><h2>Sale Bill {printBill.BillNumber}</h2><p>{printBill.BranchName} · {String(printBill.BillDate || '').slice(0, 10)}</p>
        <p><strong>GSTIN:</strong> {printBill.BranchGSTIN || '—'} <strong>State Code:</strong> {printBill.BranchStateCode || '—'}</p>
        <h3>{printBill.CustomerName}</h3><p>{printBill.CustomerMobile} · {printBill.CustomerAddress}</p>
        <table><thead><tr><th>Description</th><th>HSN</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>
          {printBill.Treatments?.filter((row) => row.IsPrinted).map((row, index) => <tr key={`pt-${index}`}><td>{row.TreatmentName}</td><td>{row.HSNCode || '—'}</td><td>1</td><td>{formatINR(row.Price)}</td><td>{formatINR(row.Price)}</td></tr>)}
          {printBill.Items?.map((row, index) => <tr key={`pi-${index}`}><td>{row.ItemName}</td><td>{row.Quantity} {row.Unit}</td><td>{formatINR(row.Rate)}</td><td>{formatINR(row.LineTotal)}</td></tr>)}
        </tbody></table><p><strong>Payment mode:</strong> {printBill.PaymentMode}</p><h2>Total: {formatINR(printBill.NetAmount)}</h2>
        <section className="bill-print-terms"><h3>Terms &amp; Conditions</h3><ol>{printBill.Terms?.map((term, index) => <li key={term.TermId || term.TermText || index}>{typeof term === 'string' ? term : term.TermText}</li>)}</ol></section>
      </section>}
    </div>
  );
}

function calculateInclusiveTax(amount, taxRate) {
  if (!amount || !taxRate) return 0;
  return Math.round((amount * taxRate / (100 + taxRate)) * 100) / 100;
}

function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({});
  const [viewingPayment, setViewingPayment] = useState(null);

  const visiblePayments = useMemo(() => {
    const matches = (value, filter) => String(value ?? '').toLowerCase().includes(String(filter || '').trim().toLowerCase());
    return payments.filter((payment) => (
      matches(payment.BillNumber, filters.billNumber)
      && matches(String(payment.BillDate || '').slice(0, 10), filters.billDate)
      && matches(payment.CustomerName, filters.client)
      && matches(payment.PaymentMode, filters.mode)
      && matches(payment.BranchName || 'Head Office', filters.branch)
      && matches(String(payment.PaymentDate || '').slice(0, 10), filters.paymentDate)
      && matches(Number(payment.Amount || 0).toFixed(2), filters.amount)
      && matches(payment.ReferenceNumber, filters.reference)
      && matches(payment.Notes, filters.details)
    ));
  }, [filters, payments]);

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  const loadPayments = async () => {
    try {
      const response = await api.get('/payments');
      setPayments(response.data);
      setError('');
    } catch (requestError) {
      console.error('Failed loading payments', requestError);
      setError(requestError.response?.data?.message || 'Failed loading payment list.');
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  return (
    <div>
      <PageHeader title="Payment List" subtitle="Payments recorded against sale bills" />
      {error && <div className="error-box" role="alert">{error}</div>}

      <div className="card list-card payments-list-card">
        <div className="bill-list-heading"><div><h3>Payment Register</h3><p>Filter payments by any column.</p></div><span className="bill-count-pill">{visiblePayments.length} payments</span></div>
        <table>
          <thead>
            <tr>
              <th>Bill No.</th><th>Bill Date</th><th>Client</th><th>Mode</th><th>Branch</th><th>Payment Date</th><th>Amount</th><th>Reference</th><th>Details</th><th>Action</th>
            </tr>
            <tr className="column-filter-row">
              <th><input aria-label="Filter by bill number" placeholder="Bill no." value={filters.billNumber || ''} onChange={(event) => updateFilter('billNumber', event.target.value)} /></th>
              <th><input aria-label="Filter by bill date" type="date" value={filters.billDate || ''} onChange={(event) => updateFilter('billDate', event.target.value)} /></th>
              <th><input aria-label="Filter by client" placeholder="Client" value={filters.client || ''} onChange={(event) => updateFilter('client', event.target.value)} /></th>
              <th><input aria-label="Filter by payment mode" placeholder="Mode" value={filters.mode || ''} onChange={(event) => updateFilter('mode', event.target.value)} /></th>
              <th><input aria-label="Filter by branch" placeholder="Branch" value={filters.branch || ''} onChange={(event) => updateFilter('branch', event.target.value)} /></th>
              <th><input aria-label="Filter by payment date" type="date" value={filters.paymentDate || ''} onChange={(event) => updateFilter('paymentDate', event.target.value)} /></th>
              <th><input aria-label="Filter by amount" placeholder="Amount" inputMode="decimal" value={filters.amount || ''} onChange={(event) => updateFilter('amount', event.target.value)} /></th>
              <th><input aria-label="Filter by reference" placeholder="Reference" value={filters.reference || ''} onChange={(event) => updateFilter('reference', event.target.value)} /></th>
              <th><input aria-label="Filter by details" placeholder="Details" value={filters.details || ''} onChange={(event) => updateFilter('details', event.target.value)} /></th>
              <th><button type="button" className="table-btn" onClick={() => setFilters({})}>Clear</button></th>
            </tr>
          </thead>
          <tbody>
            {visiblePayments.map((payment) => (
              <tr key={payment.PaymentId || payment.ReferenceNumber}>
                <td>{payment.BillNumber || '—'}</td>
                <td>{String(payment.BillDate || '').slice(0, 10)}</td>
                <td>{payment.CustomerName || '—'}</td>
                <td>{payment.PaymentMode}</td>
                <td>{payment.BranchName || 'Head Office'}</td>
                <td>{String(payment.PaymentDate || '').slice(0, 10)}</td>
                <td>{formatINR(payment.Amount)}</td>
                <td>{payment.ReferenceNumber}</td>
                <td>{payment.Notes}</td>
                <td><button type="button" className="table-btn" onClick={() => setViewingPayment(payment)}>View</button></td>
              </tr>
            ))}
            {!visiblePayments.length && <tr><td colSpan="10">No payments match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      {viewingPayment && <div className="modal-backdrop" role="presentation" onClick={() => setViewingPayment(null)}>
        <section className="payment-view-modal" role="dialog" aria-modal="true" aria-labelledby="payment-view-title" onClick={(event) => event.stopPropagation()}>
          <header><div><span>PAYMENT RECEIPT</span><h2 id="payment-view-title">{viewingPayment.BillNumber || 'Payment details'}</h2></div><button type="button" aria-label="Close payment details" onClick={() => setViewingPayment(null)}>×</button></header>
          <div className="payment-view-amount"><span>Amount received</span><strong>{formatINR(viewingPayment.Amount)}</strong><small>{viewingPayment.PaymentMode || 'Payment'}</small></div>
          <div className="payment-view-grid">
            <div><span>Client</span><strong>{viewingPayment.CustomerName || '—'}</strong></div>
            <div><span>Branch</span><strong>{viewingPayment.BranchName || 'Head Office'}</strong></div>
            <div><span>Bill date</span><strong>{String(viewingPayment.BillDate || '').slice(0, 10) || '—'}</strong></div>
            <div><span>Payment date</span><strong>{String(viewingPayment.PaymentDate || '').slice(0, 10) || '—'}</strong></div>
            <div><span>Reference</span><strong>{viewingPayment.ReferenceNumber || '—'}</strong></div>
            <div><span>Details</span><strong>{viewingPayment.Notes || '—'}</strong></div>
          </div>
          <footer><button type="button" className="primary-btn" onClick={() => setViewingPayment(null)}>Done</button></footer>
        </section>
      </div>}
    </div>
  );
}

function ReportsPage() {
  const { hasAccess } = useAuth();
  const [report, setReport] = useState({ branchSummary: [], paymentSummary: [], totalRevenue: 0 });
  const [filters, setFilters] = useState({ fromDate: '', toDate: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasAccess('reports', 'canView')) return undefined;
    let active = true;
    setLoading(true);
    api.get('/reports', { params: filters })
      .then((response) => { if (active) { setReport(response.data); setError(''); } })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Could not load reports.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, hasAccess]);

  const setDateRange = (days) => {
    const today = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days + 1);
    setFilters({ fromDate: getLocalDateKey(from), toDate: getLocalDateKey(today) });
  };
  const maxBranchRevenue = Math.max(1, ...report.branchSummary.map((row) => Number(row.TotalRevenue || 0)));
  const maxModeAmount = Math.max(1, ...report.paymentSummary.map((row) => Number(row.amount || 0)));

  return (
    <div>
      <PageHeader title="Reports" subtitle="Revenue and payment performance for the selected period" />
      <div className="report-toolbar card">
        <div><span className="report-filter-kicker">REPORT PERIOD</span><h3>Choose a duration</h3>{loading && <small className="report-loading">Updating report…</small>}</div>
        <div className="report-range-controls">
          <label><span>From</span><input type="date" value={filters.fromDate} onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))} /></label>
          <label><span>To</span><input type="date" value={filters.toDate} onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))} /></label>
          <div className="report-presets"><button type="button" className="table-btn" onClick={() => setDateRange(7)}>7 days</button><button type="button" className="table-btn" onClick={() => setDateRange(30)}>30 days</button><button type="button" className="table-btn" onClick={() => setFilters({ fromDate: '', toDate: '' })}>All time</button></div>
        </div>
      </div>
      {error && <div className="error-box" role="alert">{error}</div>}
      <div className="stats-grid report-summary-grid">
        <StatCard title="Total Revenue" value={`₹${Number(report.totalRevenue || 0).toLocaleString()}`} />
        <StatCard title="Active Branches" value={report.branchSummary.length} />
        <StatCard title="Payment Modes" value={report.paymentSummary.length} />
      </div>

      <div className="grid-two report-panels">
        <div className="card section-card report-panel">
          <h3>Branch Revenue</h3>
          <ul className="list-plain">
            {report.branchSummary.map((row) => (
              <li key={row.BranchName}>
                <div className="report-bar-label"><strong>{row.BranchName}</strong><span>{row.TotalBills || 0} bills · {formatINR(row.TotalRevenue)}</span></div>
                <div className="report-bar-track"><i style={{ width: `${Math.max(Number(row.TotalRevenue || 0) > 0 ? 4 : 0, (Number(row.TotalRevenue || 0) / maxBranchRevenue) * 100)}%` }} /></div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card section-card report-panel">
          <h3>Payment Modes</h3>
          <ul className="list-plain">
            {report.paymentSummary.map((row) => (
              <li key={row.mode}>
                <div className="report-bar-label"><strong>{row.mode}</strong><span>{formatINR(row.amount)}</span></div>
                <div className="report-bar-track report-payment-track"><i style={{ width: `${Math.max(Number(row.amount || 0) > 0 ? 4 : 0, (Number(row.amount || 0) / maxModeAmount) * 100)}%` }} /></div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle }) {
  return (
    <div className="page-header">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="card stat-card">
      <p>{title}</p>
      <h3>{value}</h3>
    </div>
  );
}

export default App;
