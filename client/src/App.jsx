import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, Link, NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_BASE });

const emptyBranch = {
  BranchCode: '',
  BranchName: '',
  Address: '',
  City: '',
  State: '',
  Pincode: '',
  Phone: '',
  Email: '',
  GSTNumber: '',
  PANNumber: '',
  InvoicePrefix: '',
};

const emptyUser = {
  FullName: '',
  Username: '',
  Password: '',
  Email: '',
  Mobile: '',
  RoleName: 'User',
  BranchId: '',
};

const emptyTerm = {
  Title: '',
  TermText: '',
  BranchId: '',
  DisplayOrder: 1,
};

const emptyBill = {
  BillNumber: '',
  CustomerName: '',
  BranchId: '',
  BillDate: new Date().toISOString().slice(0, 10),
  TotalAmount: 0,
  DiscountAmount: 0,
  GSTAmount: 0,
  NetAmount: 0,
  Notes: '',
};

const emptyPayment = {
  SaleBillId: '',
  BranchId: '',
  CustomerId: '',
  PaymentDate: new Date().toISOString().slice(0, 10),
  PaymentMode: 'Cash',
  Amount: 0,
  ReferenceNumber: '',
  Notes: '',
};

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
            <Route path="/users" element={<UsersPage />} />
            <Route path="/roles" element={<RolesPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/bills" element={<BillsPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

const AuthContext = createContext(null);

function useAuth() {
  return useContext(AuthContext);
}

function ProtectedAppLayout() {
  const { auth, setAuth } = useAuth();
  const navigate = useNavigate();

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
          <NavLink to="/branches">Branches</NavLink>
          <NavLink to="/users">Users</NavLink>
          <NavLink to="/roles">Roles</NavLink>
          <NavLink to="/terms">Terms</NavLink>
          <NavLink to="/bills">Bills</NavLink>
          <NavLink to="/payments">Payments</NavLink>
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
          <Route path="/branches" element={<BranchesPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/bills" element={<BillsPage />} />
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
            {hasAccess('branches', 'canView') && <Link to="/branches">Branch Master</Link>}
            {hasAccess('users', 'canView') && <Link to="/users">User Master</Link>}
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

  const canAdd = hasAccess('branches', 'canAdd');
  const canEdit = hasAccess('branches', 'canEdit');
  const canDelete = hasAccess('branches', 'canDelete');

  const loadBranches = async () => {
    try {
      const response = await api.get('/branches', { params: { search, activeOnly: false } });
      setBranches(response.data);
    } catch (error) {
      console.error('Failed loading branches', error);
    }
  };

  useEffect(() => {
    loadBranches();
  }, [search]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = { ...form };
    setError('');
    try {
      await api.post('/branches', payload);
      setForm(emptyBranch);
      await loadBranches();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to create branch.');
    }
  };

  const handleDelete = async (id) => {
    if (!canDelete) return;
    await api.delete(`/branches/${id}`);
    loadBranches();
  };

  return (
    <div>
      <PageHeader title="Branch Master" subtitle="Manage branch records" />

      {canAdd && (
        <div className="card form-card">
          <h3>Add Branch</h3>
          <form onSubmit={handleSubmit} className="grid-form">
            <input placeholder="Branch Code" value={form.BranchCode} onChange={(e) => setForm({ ...form, BranchCode: e.target.value })} required />
            <input placeholder="Branch Name" value={form.BranchName} onChange={(e) => setForm({ ...form, BranchName: e.target.value })} required />
            <input placeholder="Address" value={form.Address} onChange={(e) => setForm({ ...form, Address: e.target.value })} />
            <input placeholder="City" value={form.City} onChange={(e) => setForm({ ...form, City: e.target.value })} />
            <input placeholder="State" value={form.State} onChange={(e) => setForm({ ...form, State: e.target.value })} />
            <input placeholder="Pincode" value={form.Pincode} onChange={(e) => setForm({ ...form, Pincode: e.target.value })} />
            <input placeholder="Phone" value={form.Phone} onChange={(e) => setForm({ ...form, Phone: e.target.value })} />
            <input placeholder="Email" value={form.Email} onChange={(e) => setForm({ ...form, Email: e.target.value })} />
            <input placeholder="GST Number" value={form.GSTNumber} onChange={(e) => setForm({ ...form, GSTNumber: e.target.value })} />
            <input placeholder="PAN Number" value={form.PANNumber} onChange={(e) => setForm({ ...form, PANNumber: e.target.value })} />
            <input placeholder="Invoice Prefix" value={form.InvoicePrefix} onChange={(e) => setForm({ ...form, InvoicePrefix: e.target.value })} required />
            <button type="submit" className="primary-btn">Save Branch</button>
          </form>
          {error && <div className="error-box">{error}</div>}
        </div>
      )}

      <div className="card list-card">
        <div className="toolbar">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search branch" />
        </div>

        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>City</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((branch) => (
              <tr key={branch.BranchId || branch.BranchCode}>
                <td>{branch.BranchCode}</td>
                <td>{branch.BranchName}</td>
                <td>{branch.City}</td>
                <td>{branch.Phone}</td>
                <td>{branch.Email}</td>
                <td>
                  {canEdit && <button className="table-btn" type="button">Edit</button>}
                  {canDelete && <button className="danger-btn" type="button" onClick={() => handleDelete(branch.BranchId)}>Delete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersPage() {
  const { hasAccess } = useAuth();
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState(emptyUser);
  const [error, setError] = useState('');
  const [editingUserId, setEditingUserId] = useState(null);

  const canAdd = hasAccess('users', 'canAdd');
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

  useEffect(() => {
    loadUsers();
    loadBranches();
  }, []);

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
    const role = String(user.RoleCode || user.RoleName || '').replace(/[^a-z]/gi, '').toLowerCase();
    const roleName = role === 'superadmin'
      ? 'SuperAdmin'
      : role === 'branchadmin'
        ? 'BranchAdmin'
        : 'User';

    setEditingUserId(user.UserId);
    setForm({
      FullName: user.FullName || '',
      Username: user.Username || '',
      Password: '',
      Email: user.Email || '',
      Mobile: user.Mobile || '',
      RoleName: roleName,
      BranchId: roleName === 'SuperAdmin' ? '' : user.BranchId || '',
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

  return (
    <div>
      <PageHeader title="User Master" subtitle="Manage users and access" />
      {error && <div className="error-box">{error}</div>}

      {canAdd && (
        <div className="card form-card">
          <h3>{editingUserId ? 'Edit User' : 'Add User'}</h3>
          <form onSubmit={handleSubmit} className="grid-form">
            <input placeholder="Full Name" value={form.FullName} onChange={(e) => setForm({ ...form, FullName: e.target.value })} required />
            <input placeholder="Username" value={form.Username} onChange={(e) => setForm({ ...form, Username: e.target.value })} required disabled={Boolean(editingUserId)} />
            <input
              type="password"
              placeholder={editingUserId ? 'New password (optional)' : 'Password'}
              value={form.Password}
              onChange={(e) => setForm({ ...form, Password: e.target.value })}
              required={!editingUserId}
            />
            <input type="email" placeholder="Email" value={form.Email} onChange={(e) => setForm({ ...form, Email: e.target.value })} required />
            <input placeholder="Mobile" value={form.Mobile} onChange={(e) => setForm({ ...form, Mobile: e.target.value })} />
            <select
              value={form.RoleName}
              onChange={(e) => setForm({
                ...form,
                RoleName: e.target.value,
                BranchId: e.target.value === 'SuperAdmin' ? '' : form.BranchId,
              })}
            >
              <option value="SuperAdmin">SuperAdmin</option>
              <option value="BranchAdmin">BranchAdmin</option>
              <option value="User">User</option>
            </select>
            <select
              value={form.RoleName === 'SuperAdmin' ? '' : form.BranchId}
              onChange={(e) => setForm({ ...form, BranchId: e.target.value })}
              disabled={form.RoleName === 'SuperAdmin'}
              required={form.RoleName !== 'SuperAdmin'}
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

function RolesPage() {
  const { hasAccess } = useAuth();
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    if (hasAccess('roles', 'canView')) {
      api.get('/roles').then((response) => setRoles(response.data)).catch(() => {});
    }
  }, [hasAccess]);

  return (
    <div>
      <PageHeader title="Role Master" subtitle="Dynamic permissions" />

      <div className="card list-card">
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Description</th>
              <th>Dashboard</th>
              <th>Branches</th>
              <th>Users</th>
              <th>Reports</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.RoleId}>
                <td>{role.RoleName}</td>
                <td>{role.Description}</td>
                <td>{role.permissions?.dashboard?.canView ? 'Yes' : 'No'}</td>
                <td>{role.permissions?.branches?.canView ? 'Yes' : 'No'}</td>
                <td>{role.permissions?.users?.canView ? 'Yes' : 'No'}</td>
                <td>{role.permissions?.reports?.canView ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TermsPage() {
  const { hasAccess } = useAuth();
  const [terms, setTerms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState(emptyTerm);
  const [error, setError] = useState('');
  const [branchesLoading, setBranchesLoading] = useState(true);

  const loadTerms = async () => {
    try {
      const response = await api.get('/terms');
      setTerms(response.data);
    } catch (requestError) {
      console.error('Failed loading terms', requestError);
      setError(requestError.response?.data?.message || 'Failed to load terms.');
    }
  };

  const loadBranches = async () => {
    try {
      const response = await api.get('/branches', { params: { activeOnly: true } });
      setBranches(response.data);
    } catch (requestError) {
      console.error('Failed loading branches for terms', requestError);
      setError(requestError.response?.data?.message || 'Failed to load branches.');
    } finally {
      setBranchesLoading(false);
    }
  };

  useEffect(() => {
    loadTerms();
    loadBranches();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const selectedBranch = branches.find((branch) => String(branch.BranchId) === String(form.BranchId));
    if (!selectedBranch) {
      setError('Select a branch from Branch Master.');
      return;
    }

    setError('');
    try {
      await api.post('/terms', { ...form, BranchName: selectedBranch.BranchName });
      setForm(emptyTerm);
      await loadTerms();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to save terms.');
    }
  };

  return (
    <div>
      <PageHeader title="Terms & Conditions" subtitle="Manage branch policies" />
      {error && <div className="error-box">{error}</div>}
      {hasAccess('terms', 'canAdd') && (
        <div className="card form-card">
          <h3>Add Terms</h3>
          <form onSubmit={handleSubmit} className="grid-form">
            <input placeholder="Title" value={form.Title} onChange={(e) => setForm({ ...form, Title: e.target.value })} required />
            <select
              aria-label="Branch"
              value={form.BranchId}
              onChange={(e) => setForm({ ...form, BranchId: e.target.value })}
              required
              disabled={branchesLoading || branches.length === 0}
            >
              <option value="">
                {branchesLoading ? 'Loading branches...' : branches.length ? 'Select branch' : 'No branches available'}
              </option>
              {branches.map((branch) => (
                <option key={branch.BranchId} value={branch.BranchId}>{branch.BranchName}</option>
              ))}
            </select>
            <input type="number" placeholder="Display Order" value={form.DisplayOrder} onChange={(e) => setForm({ ...form, DisplayOrder: Number(e.target.value) })} required />
            <textarea placeholder="Term text" value={form.TermText} onChange={(e) => setForm({ ...form, TermText: e.target.value })} required />
            <button type="submit" className="primary-btn" disabled={branchesLoading || branches.length === 0}>Save Terms</button>
          </form>
        </div>
      )}

      <div className="card list-card">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Branch</th>
              <th>Display Order</th>
              <th>Terms</th>
            </tr>
          </thead>
          <tbody>
            {terms.map((term) => (
              <tr key={term.TermId || term.Title}>
                <td>{term.Title}</td>
                <td>{term.BranchName || 'Head Office'}</td>
                <td>{term.DisplayOrder}</td>
                <td>{term.TermText}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BillsPage() {
  const { hasAccess } = useAuth();
  const [bills, setBills] = useState([]);
  const [form, setForm] = useState(emptyBill);

  const loadBills = async () => {
    try {
      const response = await api.get('/bills');
      setBills(response.data);
    } catch (error) {
      console.error('Failed loading bills', error);
    }
  };

  useEffect(() => {
    loadBills();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await api.post('/bills', form);
    setForm(emptyBill);
    loadBills();
  };

  return (
    <div>
      <PageHeader title="Sale Bill Management" subtitle="Create and track bills" />
      {hasAccess('bills', 'canAdd') && (
        <div className="card form-card">
          <h3>Create Sale Bill</h3>
          <form onSubmit={handleSubmit} className="grid-form">
            <input placeholder="Bill Number" value={form.BillNumber} onChange={(e) => setForm({ ...form, BillNumber: e.target.value })} />
            <input placeholder="Branch ID" value={form.BranchId} onChange={(e) => setForm({ ...form, BranchId: e.target.value })} />
            <input placeholder="Customer Name" value={form.CustomerName} onChange={(e) => setForm({ ...form, CustomerName: e.target.value })} />
            <input type="date" value={form.BillDate} onChange={(e) => setForm({ ...form, BillDate: e.target.value })} />
            <input type="number" placeholder="Total Amount" value={form.TotalAmount} onChange={(e) => setForm({ ...form, TotalAmount: Number(e.target.value) })} />
            <input type="number" placeholder="Discount" value={form.DiscountAmount} onChange={(e) => setForm({ ...form, DiscountAmount: Number(e.target.value) })} />
            <input type="number" placeholder="GST" value={form.GSTAmount} onChange={(e) => setForm({ ...form, GSTAmount: Number(e.target.value) })} />
            <input type="number" placeholder="Net Amount" value={form.NetAmount} onChange={(e) => setForm({ ...form, NetAmount: Number(e.target.value) })} />
            <textarea placeholder="Notes" value={form.Notes} onChange={(e) => setForm({ ...form, Notes: e.target.value })} />
            <button type="submit" className="primary-btn">Save Bill</button>
          </form>
        </div>
      )}

      <div className="card list-card">
        <table>
          <thead>
            <tr>
              <th>Bill Number</th>
              <th>Customer</th>
              <th>Branch</th>
              <th>Net Amount</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => (
              <tr key={bill.SaleBillId || bill.BillNumber}>
                <td>{bill.BillNumber}</td>
                <td>{bill.CustomerName}</td>
                <td>{bill.BranchName || 'Head Office'}</td>
                <td>₹{Number(bill.NetAmount || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaymentsPage() {
  const { hasAccess } = useAuth();
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState(emptyPayment);

  const loadPayments = async () => {
    try {
      const response = await api.get('/payments');
      setPayments(response.data);
    } catch (error) {
      console.error('Failed loading payments', error);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await api.post('/payments', form);
    setForm(emptyPayment);
    loadPayments();
  };

  return (
    <div>
      <PageHeader title="Payment Management" subtitle="Track digital and cash payments" />
      {hasAccess('payments', 'canAdd') && (
        <div className="card form-card">
          <h3>Record Payment</h3>
          <form onSubmit={handleSubmit} className="grid-form">
            <input placeholder="Bill ID" value={form.SaleBillId} onChange={(e) => setForm({ ...form, SaleBillId: e.target.value })} />
            <input placeholder="Branch ID" value={form.BranchId} onChange={(e) => setForm({ ...form, BranchId: e.target.value })} />
            <select value={form.PaymentMode} onChange={(e) => setForm({ ...form, PaymentMode: e.target.value })}>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
            <input type="number" placeholder="Amount" value={form.Amount} onChange={(e) => setForm({ ...form, Amount: Number(e.target.value) })} />
            <input placeholder="Reference Number" value={form.ReferenceNumber} onChange={(e) => setForm({ ...form, ReferenceNumber: e.target.value })} />
            <input type="date" value={form.PaymentDate} onChange={(e) => setForm({ ...form, PaymentDate: e.target.value })} />
            <textarea placeholder="Notes" value={form.Notes} onChange={(e) => setForm({ ...form, Notes: e.target.value })} />
            <button type="submit" className="primary-btn">Save Payment</button>
          </form>
        </div>
      )}

      <div className="card list-card">
        <table>
          <thead>
            <tr>
              <th>Mode</th>
              <th>Branch</th>
              <th>Amount</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.PaymentId || payment.ReferenceNumber}>
                <td>{payment.PaymentMode}</td>
                <td>{payment.BranchName || 'Head Office'}</td>
                <td>₹{Number(payment.Amount || 0).toLocaleString()}</td>
                <td>{payment.ReferenceNumber}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportsPage() {
  const { hasAccess } = useAuth();
  const [report, setReport] = useState({ branchSummary: [], paymentSummary: [], totalRevenue: 0 });

  useEffect(() => {
    if (hasAccess('reports', 'canView')) {
      api.get('/reports').then((response) => setReport(response.data)).catch(() => {});
    }
  }, [hasAccess]);

  return (
    <div>
      <PageHeader title="Reports" subtitle="Analytics and summaries" />
      <div className="stats-grid">
        <StatCard title="Total Revenue" value={`₹${Number(report.totalRevenue || 0).toLocaleString()}`} />
      </div>

      <div className="grid-two">
        <div className="card section-card">
          <h3>Branch Revenue</h3>
          <ul className="list-plain">
            {report.branchSummary.map((row) => (
              <li key={row.BranchName}>
                <strong>{row.BranchName}:</strong> ₹{Number(row.TotalRevenue || 0).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>

        <div className="card section-card">
          <h3>Payment Modes</h3>
          <ul className="list-plain">
            {report.paymentSummary.map((row) => (
              <li key={row.mode}>
                <strong>{row.mode}:</strong> ₹{Number(row.amount || 0).toLocaleString()}
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
