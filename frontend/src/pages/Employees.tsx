import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import { Plus, Edit, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [error, setError] = useState<string | null>(null);
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
      setError(null);
      const response = await api.get("/employees/");
      setEmployees(response.data);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
      setError("社員の取得に失敗しました");
      setEmployees([]);
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

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case "admin":
        return "destructive";
      case "manager":
        return "default";
      default:
        return "secondary";
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

  const handleSubmit = async (e: React.FormEvent) => {
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
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">社員管理</h2>
          <p className="text-muted-foreground">社員の一覧と管理</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            社員を追加
          </Button>
        )}
      </div>

      {loading && <div className="text-muted-foreground">読み込み中...</div>}
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>検索とフィルター</CardTitle>
          <CardDescription>名前、メール、部署、役職で検索、またはスキルで絞り込み</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
              placeholder="名前、メール、部署、役職で検索..."
            />
          </div>

          {/* スキルフィルター */}
          {skills.length > 0 && (
            <div>
              <Label className="mb-2">スキルで絞り込み</Label>
              <div className="flex flex-wrap gap-2">
                {skills.slice(0, 20).map((skill) => (
                  <Badge
                    key={skill.id}
                    variant={selectedSkillIds.includes(skill.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleSkillFilter(skill.id)}
                  >
                    {skill.name}
                  </Badge>
                ))}
                {skills.length > 20 && (
                  <span className="px-3 py-1 text-sm text-muted-foreground">
                    +{skills.length - 20} 以上...
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee table */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredEmployees.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                社員が見つかりません
              </div>
            ) : (
              filteredEmployees.map((employee) => (
                <div key={employee.id} className="p-6 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {employee.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">
                        {employee.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {employee.email}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {employee.department} / {employee.position}
                        </span>
                        <Badge variant={getRoleBadgeVariant(employee.role)}>
                          {getRoleLabel(employee.role)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/employees/${employee.id}`)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 社員追加モーダル */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新規社員登録</DialogTitle>
            <DialogDescription>
              新しい社員の情報を入力してください
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                名前 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="田中太郎"
              />
              {formErrors.name && (
                <p className="text-sm text-destructive">{formErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                メールアドレス <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="tanaka@example.com"
              />
              {formErrors.email && (
                <p className="text-sm text-destructive">
                  {formErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                パスワード <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="6文字以上"
              />
              {formErrors.password && (
                <p className="text-sm text-destructive">
                  {formErrors.password}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">部署</Label>
              <Input
                id="department"
                type="text"
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
                placeholder="開発部"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">役職</Label>
              <Input
                id="position"
                type="text"
                value={formData.position}
                onChange={(e) =>
                  setFormData({ ...formData, position: e.target.value })
                }
                placeholder="エンジニア"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">権限</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    role: value as "employee" | "manager" | "admin",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">一般社員</SelectItem>
                  <SelectItem value="manager">マネージャー</SelectItem>
                  <SelectItem value="admin">管理者</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formErrors.general && (
              <Alert variant="destructive">
                <AlertDescription>
                  {formErrors.general}
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
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
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "登録中..." : "登録"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}