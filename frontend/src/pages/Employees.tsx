import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import { Plus, Edit, Search, X } from "lucide-react";

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

interface Skill {
  id: number;
  name: string;
  category: string;
}

export default function Employees() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    department: "",
    position: "",
    role: "employee" as "employee" | "manager" | "admin",
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    fetchEmployees();
    fetchSkills();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await api.get("/employees/");
      setEmployees(response.data);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSkills = async () => {
    try {
      const response = await api.get("/skills/");
      setSkills(response.data);
    } catch (error) {
      console.error("Failed to fetch skills:", error);
    }
  };

  const searchEmployeesBySkills = async () => {
    if (selectedSkillIds.length === 0) {
      fetchEmployees();
      return;
    }

    setLoading(true);
    try {
      const skillIds = selectedSkillIds.join(",");
      const response = await api.get(`/employees/search?skill_ids=${skillIds}`);
      setEmployees(response.data);
    } catch (error) {
      console.error("Failed to search employees by skills:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchEmployeesBySkills();
  }, [selectedSkillIds]);

  const toggleSkillFilter = (skillId: number) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId]
    );
  };

  const filteredEmployees = employees.filter(
    (employee) =>
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.position?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "manager":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "管理者";
      case "manager":
        return "マネージャー";
      default:
        return "一般社員";
    }
  };

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">社員管理</h2>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-3 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            社員を追加
          </button>
        )}
      </div>

      {loading && <div className="mb-4 text-gray-500">読み込み中...</div>}

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
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

        {/* スキルフィルター */}
        {skills.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              スキルで絞り込み
            </label>
            <div className="flex flex-wrap gap-2">
              {skills.slice(0, 20).map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => toggleSkillFilter(skill.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedSkillIds.includes(skill.id)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {skill.name}
                </button>
              ))}
              {skills.length > 20 && (
                <span className="px-3 py-1 text-sm text-gray-500">
                  +{skills.length - 20} 以上...
                </span>
              )}
            </div>
          </div>
        )}
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
                      <div className="text-sm text-gray-500">
                        {employee.email}
                      </div>
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

      {/* 社員追加モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                新規社員登録
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({
                    name: "",
                    email: "",
                    password: "",
                    department: "",
                    position: "",
                    role: "employee",
                  });
                  setFormErrors({});
                }}
                aria-label="閉じる"
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();

                // バリデーション
                const errors: { [key: string]: string } = {};
                if (!formData.name.trim()) errors.name = "名前は必須です";
                if (!formData.email.trim())
                  errors.email = "メールアドレスは必須です";
                if (!formData.password.trim()) {
                  errors.password = "パスワードは必須です";
                } else if (formData.password.length < 6) {
                  errors.password = "パスワードは6文字以上で入力してください";
                }

                if (Object.keys(errors).length > 0) {
                  setFormErrors(errors);
                  return;
                }

                setSubmitting(true);
                setFormErrors({});

                try {
                  await api.post("/employees/", formData);
                  await fetchEmployees();
                  setShowAddModal(false);
                  setFormData({
                    name: "",
                    email: "",
                    password: "",
                    department: "",
                    position: "",
                    role: "employee",
                  });
                } catch (error: any) {
                  if (error.response?.status === 400) {
                    setFormErrors({
                      email: "このメールアドレスは既に登録されています",
                    });
                  } else {
                    setFormErrors({ general: "社員の登録に失敗しました" });
                  }
                } finally {
                  setSubmitting(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="田中太郎"
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="tanaka@example.com"
                />
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {formErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  パスワード <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="6文字以上"
                />
                {formErrors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {formErrors.password}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  部署
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="開発部"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  役職
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) =>
                    setFormData({ ...formData, position: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="エンジニア"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  権限
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as "employee" | "manager" | "admin",
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="employee">一般社員</option>
                  <option value="manager">マネージャー</option>
                  <option value="admin">管理者</option>
                </select>
              </div>

              {formErrors.general && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-800">
                    {formErrors.general}
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({
                      name: "",
                      email: "",
                      password: "",
                      department: "",
                      position: "",
                      role: "employee",
                    });
                    setFormErrors({});
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "登録中..." : "登録"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
