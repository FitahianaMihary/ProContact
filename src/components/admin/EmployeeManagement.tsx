import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePayment } from "@/contexts/PaymentContext";
import axios from 'axios';
import { API_BASE_URL } from '../../config';

axios.defaults.baseURL = API_BASE_URL;

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture: string;
  age: number;
  gender: string;
  status: "active" | "inactive";
  createdAt: string;
}

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    profilePicture: "",
    age: "",
    gender: "",
    password: ""
  });

  const { toast } = useToast();
  const { user } = usePayment();

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchEmployees();
    }
  }, [user]);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get('/users/employees');
      setEmployees(response.data.map((emp: any) => ({
        id: emp.id,
        firstName: emp.name?.split(' ')[0] || emp.email.split('@')[0],
        lastName: emp.name?.split(' ')[1] || '',
        email: emp.email,
        profilePicture: emp.profile_picture || '',
        age: emp.age || 25,
        gender: emp.gender || 'male',
        status: emp.status || 'active',
        createdAt: emp.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
      })));
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to fetch employees. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAddEmployee = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.age || !formData.gender || !formData.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const age = parseInt(formData.age);
    if (isNaN(age) || age < 18 || age > 40) {
      toast({
        title: "Error",
        description: "Age must be between 18 and 40",
        variant: "destructive"
      });
      return;
    }

    try {
      await axios.post('/auth/register', {
        email: formData.email,
        password: formData.password,
        name: `${formData.firstName} ${formData.lastName}`,
        role: 'employee',
        age: age,
        gender: formData.gender,
        profile_picture: formData.profilePicture
      });

      await fetchEmployees();
      setFormData({ firstName: "", lastName: "", email: "", profilePicture: "", age: "", gender: "", password: "" });
      setIsAddDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Employee added successfully"
      });
    } catch (error: any) {
      console.error('Error adding employee:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to add employee. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      profilePicture: employee.profilePicture,
      age: employee.age.toString(),
      gender: employee.gender,
      password: ""
    });
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return;

    const age = parseInt(formData.age);
    if (isNaN(age) || age < 18 || age > 40) {
      toast({
        title: "Error",
        description: "Age must be between 18 and 40",
        variant: "destructive"
      });
      return;
    }

    try {
      await axios.patch(`/users/${editingEmployee.id}`, {
        name: `${formData.firstName} ${formData.lastName}`,
        age: age,
        gender: formData.gender,
        profile_picture: formData.profilePicture
      });

      await fetchEmployees();
      setEditingEmployee(null);
      setFormData({ firstName: "", lastName: "", email: "", profilePicture: "", age: "", gender: "", password: "" });
      
      toast({
        title: "Success",
        description: "Employee updated successfully"
      });
    } catch (error) {
      console.error('Error updating employee:', error);
      toast({
        title: "Error",
        description: "Failed to update employee. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      await axios.delete(`/users/${id}`);
      await fetchEmployees();
      toast({
        title: "Success",
        description: "Employee deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast({
        title: "Error",
        description: "Failed to delete employee. Please try again.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({ firstName: "", lastName: "", email: "", profilePicture: "", age: "", gender: "", password: "" });
    setEditingEmployee(null);
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or valid numbers only
    if (value === '' || /^[0-9]*$/.test(value)) {
      setFormData({...formData, age: value});
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Employee Management</h3>
          <p className="text-gray-600">Manage your call center employees</p>
        </div>
        <Dialog open={isAddDialogOpen || !!editingEmployee} onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? "Edit Employee" : "Add New Employee"}</DialogTitle>
              <DialogDescription>
                {editingEmployee ? "Update employee information" : "Fill in the employee details below"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="employee@procontact.com"
                  disabled={!!editingEmployee}
                />
              </div>
              {!editingEmployee && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Enter password"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="profilePicture">Profile Picture URL</Label>
                <Input
                  id="profilePicture"
                  value={formData.profilePicture}
                  onChange={(e) => setFormData({...formData, profilePicture: e.target.value})}
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age *</Label>
                  <Input
                    id="age"
                    type="number"
                    min="18"
                    max="40"
                    value={formData.age}
                    onChange={handleAgeChange}
                    placeholder="25"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select value={formData.gender} onValueChange={(value) => setFormData({...formData, gender: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={editingEmployee ? handleUpdateEmployee : handleAddEmployee}>
                {editingEmployee ? "Update" : "Add"} Employee
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee List</CardTitle>
          <CardDescription>
            Total employees: {employees.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={employee.profilePicture} />
                      <AvatarFallback>
                        {employee.firstName[0]}{employee.lastName[0] || employee.firstName[1] || ''}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{employee.firstName} {employee.lastName}</div>
                      <div className="text-sm text-gray-500">ID: {employee.id}</div>
                    </div>
                  </TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.age}</TableCell>
                  <TableCell className="capitalize">{employee.gender}</TableCell>
                  <TableCell>
                    <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                      {employee.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditEmployee(employee)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeleteEmployee(employee.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeManagement;