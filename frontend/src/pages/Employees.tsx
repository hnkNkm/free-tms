import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Plus, Edit, Search, Filter } from 'lucide-react';

interface Employee {
  id: number;
  name: string;
  email: string;
  department?: string;
  position?: string;
  role: string;
  is_active: boolean;
  joined_date?: string;
}

export default function Employees() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(
    (employee) =>
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employee.department?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (employee.position?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return '管理者';
      case 'manager':
        return 'マネージャー';
      default:
        return '一般社員';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">社員管理</h2>
        <button
          onClick={() => navigate('/employees/new')}
          className="mt-3 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          社員を追加
        </button>
      </div>

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="名前、メール、部署、役職で検索..."
          />
        </div>
      </div>

      {/* Employee table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredEmployees.length === 0 ? (
            <li className="px-6 py-4 text-center text-gray-500">
              社員が見つかりません
            </li>
          ) : (
            filteredEmployees.map((employee) => (
              <li key={employee.id}>
                <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-gray-600 font-medium">
                        {employee.name.charAt(0)}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {employee.name}
                      </div>
                      <div className="text-sm text-gray-500">{employee.email}</div>
                      <div className="flex items-center mt-1">
                        <span className="text-xs text-gray-500">
                          {employee.department} / {employee.position}
                        </span>
                        <span
                          className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(
                            employee.role
                          )}`}
                        >
                          {getRoleLabel(employee.role)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/employees/${employee.id}`)}
                    className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}