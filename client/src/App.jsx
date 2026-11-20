import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, Link, NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

const emptyBranch = {
  BranchCode: '',
  BranchName: '',
  Address: '',
  Terms: [''],
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
  BillDate: new Date().toISOString().slice(0, 10),
  NextServiceDate: '',
  PaymentMode: 'Cash',
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
            <Route path="/clients" element={<MasterPage key="/clients" config={clientMasterConfig} />} />
            <Route path="/brands" element={<MasterPage key="/brands" config={brandMasterConfig} />} />
            <Route path="/units" element={<MasterPage key="/units" config={unitMasterConfig} />} />
            <Route path="/groups" element={<MasterPage key="/groups" config={groupMasterConfig} />} />
            <Route path="/treatments" element={<MasterPage key="/treatments" config={treatmentMasterConfig} />} />
            <Route path="/items" element={<MasterPage key="/items" config={itemMasterConfig} />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/roles" element={<RolesPage />} />
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
          <NavLink to="/branches">Branch Master</NavLink>
          <NavLink to="/clients">Client Master</NavLink>
          <NavLink to="/brands">Brand Master</NavLink>
          <NavLink to="/units">Unit Master</NavLink>
          <NavLink to="/groups">Group Master</NavLink>
          <NavLink to="/treatments">Treatment Master</NavLink>
          <NavLink to="/items">Item Master</NavLink>
          <NavLink to="/users">Users</NavLink>
          <NavLink to="/roles">Roles</NavLink>
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
          <Route path="/clients" element={<MasterPage key="/clients" config={clientMasterConfig} />} />
          <Route path="/brands" element={<MasterPage key="/brands" config={brandMasterConfig} />} />
          <Route path="/units" element={<MasterPage key="/units" config={unitMasterConfig} />} />
          <Route path="/groups" element={<MasterPage key="/groups" config={groupMasterConfig} />} />
          <Route path="/treatments" element={<MasterPage key="/treatments" config={treatmentMasterConfig} />} />
          <Route path="/items" element={<MasterPage key="/items" config={itemMasterConfig} />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/roles" element={<RolesPage />} />
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
            {hasAccess('clients', 'canView') && <Link to="/clients">Client Master</Link>}
            {hasAccess('brands', 'canView') && <Link to="/brands">Brand Master</Link>}
            {hasAccess('units', 'canView') && <Link to="/units">Unit Master</Link>}
            {hasAccess('groups', 'canView') && <Link to="/groups">Group Master</Link>}
            {hasAccess('treatments', 'canView') && <Link to="/treatments">Treatment Master</Link>}
            {hasAccess('items', 'canView') && <Link to="/items">Item Master</Link>}
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

  const handleEdit = (branch) => {
    setEditingBranchId(branch.BranchId);
    setForm({
      BranchCode: branch.BranchCode || '',
      BranchName: branch.BranchName || '',
      Address: branch.Address || '',
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
                  {branch.IsActive && canEdit && <button className="table-btn" type="button" onClick={() => handleEdit(branch)}>Edit</button>}
                  {branch.IsActive && canDelete && <button className="danger-btn" type="button" onClick={() => handleDelete(branch.BranchId)}>Delete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
    { name: 'TaxRate', label: 'Tax Rate (%)', type: 'number', required: true, min: 0, step: '0.01' },
    { name: 'TotalPrice', label: 'Total Price (including GST)', type: 'number', required: true, min: 0, step: '0.01' },
    { name: 'TreatmentType', label: 'Treatment Type', required: true, options: ['Bill', 'Query'] },
    { name: 'ProductType', label: 'Product Type', required: true, options: ['Service', 'Product'] },
  ],
  columns: [
    { key: 'TreatmentName', label: 'Treatment' },
    { key: 'AliasName', label: 'Alias Name' },
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
  const canAdd = hasAccess(config.module, 'canAdd');
  const canEdit = hasAccess(config.module, 'canEdit');
  const canDelete = hasAccess(config.module, 'canDelete');

  const loadRecords = useCallback(async () => {
    try {
      const optionFields = config.fields.filter((field) => field.optionsEndpoint);
      const responses = await Promise.all([
        api.get(config.endpoint),
        ...optionFields.map((field) => api.get(field.optionsEndpoint)),
      ]);
      setRecords(responses[0].data);
      setDropdownOptions(Object.fromEntries(optionFields.map((field, index) => [
        field.optionsEndpoint,
        responses[index + 1].data.filter((option) => option.IsActive),
      ])));
    } catch (requestError) {
      console.error(`Failed loading ${config.title}`, requestError);
      setError(requestError.response?.data?.message || `Failed loading ${config.title.toLowerCase()}.`);
    }
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

  return (
    <div>
      <PageHeader title={config.title} subtitle={config.subtitle} />
      {error && <div className="error-box">{error}</div>}
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

function BillsPage() {
  const { auth, hasAccess } = useAuth();
  const [bills, setBills] = useState([]);
  const [branches, setBranches] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ ...emptyBill, BranchId: auth.user?.BranchId || '' });
  const [treatmentRows, setTreatmentRows] = useState([{ TreatmentId: '', StaffName: '', TaxRate: 0, GSTAmount: 0, Price: 0, IsPrinted: false }]);
  const [itemRows, setItemRows] = useState([{ ItemId: '', Quantity: 1, Remarks: '' }]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [clientLookupStatus, setClientLookupStatus] = useState({ type: '', message: '' });
  const autofilledClientRef = useRef(null);

  const loadBills = useCallback(async () => {
    try {
      const response = await api.get('/bills');
      setBills(response.data);
    } catch (requestError) {
      console.error('Failed loading bills', requestError);
      setError(requestError.response?.data?.message || 'Failed loading bills.');
    }
  }, []);

  useEffect(() => {
    let active = true;
    const loadSaleOptions = async () => {
      try {
        const [treatmentResponse, itemResponse, billResponse] = await Promise.all([
          api.get('/treatments'),
          api.get('/items'),
          api.get('/bills'),
        ]);
        if (!active) return;
        setTreatments(treatmentResponse.data.filter((treatment) => treatment.IsActive));
        setItems(itemResponse.data.filter((item) => item.IsActive));
        setBills(billResponse.data);
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
    const contactNo = form.CustomerMobile.trim();
    if (!contactNo) return undefined;

    let active = true;
    const timeoutId = setTimeout(async () => {
      setClientLookupStatus({ type: 'loading', message: 'Looking up client...' });
      try {
        const response = await api.get('/clients/lookup', { params: { contactNo } });
        if (!active) return;
        if (!response.data) {
          setClientLookupStatus({ type: 'not-found', message: 'No matching client found. Enter the details manually.' });
          return;
        }

        const client = response.data;
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
  }, [form.CustomerMobile]);

  const handleClientContactChange = (contactNo) => {
    const previousClient = autofilledClientRef.current;
    autofilledClientRef.current = null;
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
    return total + (item ? Number(item.TotalPrice || 0) * Number(row.Quantity || 0) : 0);
  }, 0);
  const itemTax = itemRows.reduce((total, row) => {
    const item = items.find((option) => String(option.ItemId) === String(row.ItemId));
    return total + (item
      ? calculateInclusiveTax(Number(item.TotalPrice || 0) * Number(row.Quantity || 0), Number(item.TaxRate || 0))
      : 0);
  }, 0);
  const grossTotal = treatmentTotal + itemTotal;
  const gstTotal = treatmentTax + itemTax;
  const grandTotal = grossTotal;

  const handleTreatmentChange = (index, treatmentId) => {
    const selected = treatments.find((treatment) => String(treatment.TreatmentId) === treatmentId);
    const price = Number(selected?.TotalPrice || 0);
    const taxRate = Number(selected?.TaxRate || 0);
    setTreatmentRows((current) => current.map((row, rowIndex) => (
      rowIndex === index
        ? {
          ...row,
          TreatmentId: treatmentId,
          TaxRate: taxRate,
          GSTAmount: calculateInclusiveTax(price, taxRate),
          Price: price,
        }
        : row
    )));
  };

  const handleItemChange = (index, itemId) => {
    setItemRows((current) => current.map((row, rowIndex) => (
      rowIndex === index ? { ...row, ItemId: itemId } : row
    )));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    const payload = {
      ...form,
      Treatments: treatmentRows.filter((row) => row.TreatmentId).map(({ TreatmentId, StaffName, IsPrinted, Price, GSTAmount }) => ({
        TreatmentId,
        StaffName,
        IsPrinted,
        Price: Number(Price),
        GSTAmount: Number(GSTAmount),
      })),
      Items: itemRows.filter((row) => row.ItemId).map(({ ItemId, Quantity, Remarks }) => ({
        ItemId,
        Quantity: Number(Quantity),
        Remarks,
      })),
    };
    try {
      const response = await api.post('/bills', payload);
      setSuccess(`Sale bill ${response.data.BillNumber} saved.`);
      autofilledClientRef.current = null;
      setClientLookupStatus({ type: '', message: '' });
      setForm({ ...emptyBill, BranchId: form.BranchId });
      setTreatmentRows([{ TreatmentId: '', StaffName: '', TaxRate: 0, GSTAmount: 0, Price: 0, IsPrinted: false }]);
      setItemRows([{ ItemId: '', Quantity: 1, Remarks: '' }]);
      await loadBills();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to save sale bill.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Sale" subtitle="Create treatment and item sale bills" />
      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}
      {hasAccess('bills', 'canAdd') && (
        <form className="sale-form" onSubmit={handleSubmit}>
          <div className="sale-layout">
            <div className="sale-main">
              <section className="card form-card">
                <h3>Client &amp; Bill Details</h3>
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
                    <input type="email" value={form.CustomerEmail} onChange={(event) => setForm({ ...form, CustomerEmail: event.target.value })} maxLength={254} />
                  </label>
                  <label>
                    <span>Date</span>
                    <input type="date" min="1900-01-01" value={form.BillDate} onChange={(event) => setForm({ ...form, BillDate: event.target.value })} required />
                  </label>
                  <label>
                    <span>Payment Mode</span>
                    <select value={form.PaymentMode} onChange={(event) => setForm({ ...form, PaymentMode: event.target.value })}>
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="MIX">MIX</option>
                    </select>
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
                  <table className="sale-lines-table">
                    <thead>
                      <tr><th>Action</th><th>Treatment Name</th><th>Staff Name</th><th>GST %</th><th>GST Amount</th><th>Price</th><th>Print</th></tr>
                    </thead>
                    <tbody>
                      {treatmentRows.map((row, index) => (
                        <tr key={`treatment-${index}`}>
                          <td><button type="button" className="danger-btn" onClick={() => setTreatmentRows(treatmentRows.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remove treatment">Remove</button></td>
                          <td>
                            <select value={row.TreatmentId} onChange={(event) => handleTreatmentChange(index, event.target.value)}>
                              <option value="">{treatments.length ? 'Select treatment' : 'No treatments in Treatment Master'}</option>
                              {treatments.map((treatment) => <option key={treatment.TreatmentId} value={treatment.TreatmentId}>{treatment.TreatmentName}</option>)}
                            </select>
                          </td>
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
                  <button type="button" className="primary-btn" onClick={() => setItemRows([...itemRows, { ItemId: '', Quantity: 1, Remarks: '' }])}>Add Row</button>
                </div>
                <div className="sale-table-scroll">
                  <table className="sale-lines-table">
                    <thead>
                      <tr><th>Action</th><th>Item Name</th><th>Quantity</th><th>Unit</th><th>Price</th><th>Remarks</th></tr>
                    </thead>
                    <tbody>
                      {itemRows.map((row, index) => {
                        const selectedItem = items.find((item) => String(item.ItemId) === String(row.ItemId));
                        return (
                          <tr key={`item-${index}`}>
                            <td><button type="button" className="danger-btn" onClick={() => setItemRows(itemRows.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remove item">Remove</button></td>
                            <td>
                              <select value={row.ItemId} onChange={(event) => handleItemChange(index, event.target.value)}>
                                <option value="">{items.length ? 'Select item' : 'No items in Item Master'}</option>
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
              <div><span>Treatments</span><strong>₹{treatmentTotal.toFixed(2)}</strong></div>
              <div><span>Row Items</span><strong>₹{itemTotal.toFixed(2)}</strong></div>
              <div><span>GST included</span><strong>₹{gstTotal.toFixed(2)}</strong></div>
              <div className="sale-grand-total"><span>Total Amount</span><strong>₹{grandTotal.toFixed(2)}</strong></div>
              <button type="submit" className="primary-btn" disabled={saving || !form.BranchId}>
                {saving ? 'Saving Sale...' : 'Save Sale'}
              </button>
              {!form.BranchId && <small>Select a branch or sign in with a branch assigned to your user.</small>}
            </aside>
          </div>
        </form>
      )}

      <div className="card list-card">
        <h3>Recent Sales</h3>
        <table>
          <thead>
            <tr>
              <th>Bill Number</th><th>Client</th><th>Date</th><th>Branch</th><th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => (
              <tr key={bill.SaleBillId || bill.BillNumber}>
                <td>{bill.BillNumber}</td>
                <td>{bill.CustomerName}</td>
                <td>{String(bill.BillDate || '').slice(0, 10)}</td>
                <td>{bill.BranchName || 'Head Office'}</td>
                <td>₹{Number(bill.NetAmount ?? bill.GrandTotal ?? 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function calculateInclusiveTax(amount, taxRate) {
  if (!amount || !taxRate) return 0;
  return Math.round((amount * taxRate / (100 + taxRate)) * 100) / 100;
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
