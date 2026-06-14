import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, UserRound, ShieldCheck, ShieldX, Pencil } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { Employee } from '../types';
import { deleteApiResource, patchApiResource, postApiResource } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type EmployeeRole = Employee['role'];

export default function Employees() {
  const { employees, fetchEmployees, loading, loaded, errors } = useInventory();
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<EmployeeRole>('operation');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [notes, setNotes] = useState('');
  const [password, setPassword] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<EmployeeRole>('operation');
  const [editPhone, setEditPhone] = useState('');
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    void fetchEmployees();
  }, [fetchEmployees]);

  const isLoading = !loaded.employees || loading.employees;
  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return employees;
    }

    return employees.filter((employee) => {
      return (
        employee.name.toLowerCase().includes(query) ||
        (employee.email ?? '').toLowerCase().includes(query) ||
        employee.role.toLowerCase().includes(query) ||
        (employee.phone ?? '').toLowerCase().includes(query) ||
        (employee.job_title ?? '').toLowerCase().includes(query) ||
        (employee.department ?? '').toLowerCase().includes(query)
      );
    });
  }, [employees, search]);

  const activeEmployees = employees.filter((employee) => employee.is_active).length;
  const inactiveEmployees = employees.length - activeEmployees;
  const editingEmployee = employees.find((employee) => employee.id === editingEmployeeId) ?? null;

  const hasEmployeeValidationError = !name.trim() || password.length < 8;
  const createDisabled = isCreating;

  const onCreate = async () => {
    if (hasEmployeeValidationError) {
      toast.error('Employee name and an 8 character password are required.');
      return;
    }

    setIsCreating(true);
    try {
      await postApiResource<Employee>('/employees', {
        name: name.trim(),
        email: email.trim() || null,
        role,
        phone: phone.trim() || null,
        job_title: jobTitle.trim() || null,
        department: department.trim() || null,
        notes: notes.trim() || null,
        password,
      });
      await fetchEmployees();
      setName('');
      setEmail('');
      setRole('operation');
      setPhone('');
      setJobTitle('');
      setDepartment('');
      setNotes('');
      setPassword('');
      toast.success('Employee created');
    } catch (error) {
      console.error('Create employee failed', error);
      toast.error(error instanceof Error ? error.message : 'Create employee failed');
    } finally {
      setIsCreating(false);
    }
  };

  const onDelete = async (employeeId: number) => {
    if (!confirm('Delete employee?')) {
      return;
    }

    setDeletingId(employeeId);
    try {
      await deleteApiResource(`/employees/${employeeId}`);
      await fetchEmployees();
      toast.success('Employee deleted');
    } catch (error) {
      console.error('Delete failed', error);
      toast.error(error instanceof Error ? error.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleEmployeeStatus = async (employee: Employee) => {
    setSavingId(employee.id);
    try {
      await patchApiResource<Employee>(`/employees/${employee.id}`, {
        is_active: !employee.is_active,
      });
      await fetchEmployees();
      toast.success(employee.is_active ? 'Employee disabled' : 'Employee enabled');
    } catch (error) {
      console.error('Update employee failed', error);
      toast.error(error instanceof Error ? error.message : 'Update employee failed');
    } finally {
      setSavingId(null);
    }
  };

  const startEditing = (employee: Employee) => {
    setEditingEmployeeId(employee.id);
    setEditName(employee.name);
    setEditEmail(employee.email ?? '');
    setEditRole(employee.role);
    setEditPhone(employee.phone ?? '');
    setEditJobTitle(employee.job_title ?? '');
    setEditDepartment(employee.department ?? '');
    setEditNotes(employee.notes ?? '');
  };

  const cancelEditing = () => {
    setEditingEmployeeId(null);
    setEditName('');
    setEditEmail('');
    setEditRole('operation');
    setEditPhone('');
    setEditJobTitle('');
    setEditDepartment('');
    setEditNotes('');
  };

  const saveEmployeeDetails = async () => {
    if (!editingEmployeeId) {
      return;
    }

    if (!editName.trim()) {
      toast.error('Employee name is required.');
      return;
    }

    setSavingId(editingEmployeeId);
    try {
      await patchApiResource<Employee>(`/employees/${editingEmployeeId}`, {
        name: editName.trim(),
        email: editEmail.trim() || null,
        role: editRole,
        phone: editPhone.trim() || null,
        job_title: editJobTitle.trim() || null,
        department: editDepartment.trim() || null,
        notes: editNotes.trim() || null,
      });
      await fetchEmployees();
      cancelEditing();
      toast.success('Employee details updated');
    } catch (error) {
      console.error('Update employee details failed', error);
      toast.error(error instanceof Error ? error.message : 'Update employee details failed');
    } finally {
      setSavingId(null);
    }
  };

  const updateEmployeeRole = async (employee: Employee, nextRole: EmployeeRole) => {
    setSavingId(employee.id);
    try {
      await patchApiResource<Employee>(`/employees/${employee.id}`, {
        role: nextRole,
      });
      await fetchEmployees();
      toast.success('Employee role updated');
    } catch (error) {
      console.error('Update employee role failed', error);
      toast.error(error instanceof Error ? error.message : 'Update employee role failed');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-gray-500 mt-1">Manage staff access and account status.</p>
        </div>
        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-slate-500" />}
      </div>

      {errors.employees && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.employees}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Employees</span>
            <UserRound className="h-4 w-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{loaded.employees ? employees.length : '--'}</span>
            <span className="text-xs text-slate-500 mb-1">{loaded.employees ? 'Accounts' : 'Loading...'}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active</span>
            <ShieldCheck className="h-4 w-4 text-green-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{loaded.employees ? activeEmployees : '--'}</span>
            <span className="text-xs text-slate-400 mb-1">Enabled accounts</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inactive</span>
            <ShieldX className="h-4 w-4 text-red-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{loaded.employees ? inactiveEmployees : '--'}</span>
            <span className="text-xs text-slate-400 mb-1">Disabled accounts</span>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="text-lg">Create Employee</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Add a new employee account to the system.</p>
            </div>
            <div className="relative w-full lg:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                className="pl-9 bg-gray-50"
                placeholder="Search name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="Employee name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              value={role}
              onChange={(e) => setRole(e.target.value as EmployeeRole)}
            >
              <option value="operation">Operation</option>
              <option value="security">Security</option>
              <option value="admin">Admin</option>
            </select>
            <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input placeholder="Job title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            <Input placeholder="Department" value={department} onChange={(e) => setDepartment(e.target.value)} />
          </div>
          <textarea
            className="mt-3 min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="mt-3 text-xs text-slate-500">
            Password must be at least 8 characters. Email is optional.
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={onCreate} disabled={createDisabled}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create employee
            </Button>
          </div>
        </CardContent>
      </Card>

      {editingEmployee && (
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-lg">Edit Employee</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Update profile details for {editingEmployee.name}.</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <Input placeholder="Employee name" value={editName} onChange={(e) => setEditName(e.target.value)} />
              <Input placeholder="Email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              <select
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as EmployeeRole)}
              >
                <option value="operation">Operation</option>
                <option value="security">Security</option>
                <option value="admin">Admin</option>
              </select>
              <Input placeholder="Phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              <Input placeholder="Job title" value={editJobTitle} onChange={(e) => setEditJobTitle(e.target.value)} />
              <Input placeholder="Department" value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} />
            </div>
            <textarea
              className="mt-3 min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              placeholder="Notes"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={cancelEditing} disabled={savingId === editingEmployeeId}>
                Cancel
              </Button>
              <Button onClick={saveEmployeeDetails} disabled={savingId === editingEmployeeId}>
                {savingId === editingEmployeeId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Employee Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold px-4 py-2">Name</TableHead>
                  <TableHead className="font-bold px-4 py-2">Email</TableHead>
                  <TableHead className="font-bold px-4 py-2">Role</TableHead>
                  <TableHead className="font-bold px-4 py-2">Contact</TableHead>
                  <TableHead className="font-bold px-4 py-2">Department</TableHead>
                  <TableHead className="font-bold px-4 py-2">Status</TableHead>
                  <TableHead className="font-bold px-4 py-2 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-[11px] divide-y divide-gray-100">
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                      Loading employees...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && filteredEmployees.map((employee) => (
                  <TableRow key={employee.id} className="hover:bg-gray-50/50">
                    <TableCell className="px-4 py-3">
                      <div className="font-bold text-slate-800">{employee.name}</div>
                      <div className="mt-1 text-[10px] text-slate-400">{employee.job_title || 'No job title'}</div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-slate-500">{employee.email || 'No email'}</TableCell>
                    <TableCell className="px-4 py-3">
                      <select
                        className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700"
                        value={employee.role}
                        onChange={(event) => updateEmployeeRole(employee, event.target.value as EmployeeRole)}
                        disabled={savingId === employee.id}
                      >
                        <option value="operation">Operation</option>
                        <option value="security">Security</option>
                        <option value="admin">Admin</option>
                      </select>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-slate-500">{employee.phone || 'No phone'}</TableCell>
                    <TableCell className="px-4 py-3 text-slate-500">
                      <div>{employee.department || 'No department'}</div>
                      {employee.notes && <div className="mt-1 max-w-48 truncate text-[10px] text-slate-400">{employee.notes}</div>}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={`${employee.is_active ? 'bg-green-100/50 text-green-700 border-green-200 hover:bg-green-100/50' : 'bg-red-100/50 text-red-700 border-red-200 hover:bg-red-100/50'} border`}
                      >
                        {employee.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditing(employee)}
                          disabled={savingId === employee.id}
                        >
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleEmployeeStatus(employee)}
                          disabled={savingId === employee.id}
                        >
                          {employee.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onDelete(employee.id)}
                          disabled={deletingId === employee.id}
                        >
                          {deletingId === employee.id && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && filteredEmployees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                      {search ? 'No employees found matching your search.' : 'No employees found.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
