import { useState, useEffect } from "react";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Mail, Phone, Globe, MapPin, Edit, Trash2, Plus, Search, Eye, X, ChevronUp, ChevronDown } from "lucide-react";

interface Client {
  id: number;
  name: string;
  industry: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  project_count?: number;
  active_project_count?: number;
  created_at: string;
}

interface ClientFormData {
  name: string;
  industry: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  website: string;
  notes: string;
}

export default function Clients() {
  const user = useAuthStore((state) => state.user);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "created_at">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<ClientFormData>({
    name: "",
    industry: "",
    contact_person: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    website: "",
    notes: "",
  });

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const canEdit = isAdmin || isManager;

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    filterAndSortClients();
  }, [clients, searchTerm, industryFilter, sortBy, sortOrder]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await api.get("/clients/");
      setClients(response.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch clients:", err);
      setError("クライアントの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortClients = () => {
    let filtered = [...clients];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (client) =>
          client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Industry filter
    if (industryFilter !== "all") {
      filtered = filtered.filter((client) => client.industry === industryFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "created_at") {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    setFilteredClients(filtered);
  };

  const getUniqueIndustries = () => {
    const industries = new Set<string>();
    clients.forEach((client) => {
      if (client.industry) industries.add(client.industry);
    });
    return Array.from(industries).sort();
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name) {
      errors.name = "会社名は必須です";
    }

    if (!formData.industry) {
      errors.industry = "業界は必須です";
    }

    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      errors.contact_email = "有効なメールアドレスを入力してください";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAdd = async () => {
    if (!validateForm()) return;

    try {
      const response = await api.post("/clients/", formData);
      setClients([...clients, response.data]);
      setShowAddModal(false);
      resetForm();
    } catch (err: any) {
      if (err.response?.status === 400) {
        setFormErrors({ name: "この会社名は既に登録されています" });
      } else {
        alert("クライアントの追加に失敗しました");
      }
    }
  };

  const handleEdit = async () => {
    if (!selectedClient || !validateForm()) return;

    try {
      const response = await api.put(`/clients/${selectedClient.id}`, formData);
      setClients(clients.map((c) => (c.id === selectedClient.id ? response.data : c)));
      setShowEditModal(false);
      resetForm();
    } catch (err: any) {
      if (err.response?.status === 400) {
        setFormErrors({ name: "この会社名は既に登録されています" });
      } else {
        alert("クライアントの更新に失敗しました");
      }
    }
  };

  const handleDelete = async (client: Client) => {
    if (!window.confirm(`${client.name}を削除してもよろしいですか？\n関連するプロジェクトがある場合は削除できません。`)) {
      return;
    }

    try {
      await api.delete(`/clients/${client.id}`);
      setClients(clients.filter((c) => c.id !== client.id));
    } catch (err: any) {
      if (err.response?.status === 400) {
        alert("プロジェクトが存在するため削除できません");
      } else {
        alert("クライアントの削除に失敗しました");
      }
    }
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name,
      industry: client.industry || "",
      contact_person: client.contact_person || "",
      contact_email: client.contact_email || "",
      contact_phone: client.contact_phone || "",
      address: client.address || "",
      website: client.website || "",
      notes: client.notes || "",
    });
    setShowEditModal(true);
  };

  const openDetailModal = (client: Client) => {
    setSelectedClient(client);
    setShowDetailModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      industry: "",
      contact_person: "",
      contact_email: "",
      contact_phone: "",
      address: "",
      website: "",
      notes: "",
    });
    setFormErrors({});
    setSelectedClient(null);
  };

  const toggleSort = (field: "name" | "created_at") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">クライアント管理</h1>
        {canEdit && (
          <Button onClick={openAddModal}>
            <Plus className="mr-2 h-4 w-4" />
            新規クライアント
          </Button>
        )}
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="クライアント名で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-[180px]" aria-label="業界">
            <SelectValue placeholder="業界" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {getUniqueIndustries().map((industry) => (
              <SelectItem key={industry} value={industry}>
                {industry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleSort("name")}
          className="flex items-center gap-1"
        >
          会社名
          {sortBy === "name" && (sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleSort("created_at")}
          className="flex items-center gap-1"
        >
          登録日
          {sortBy === "created_at" && (sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
        </Button>
      </div>

      {filteredClients.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">クライアントが登録されていません</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card key={client.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg" data-testid="client-name">
                      {client.name}
                    </CardTitle>
                    <CardDescription>{client.industry || "業界未設定"}</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDetailModal(client)}
                      aria-label="詳細"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(client)}
                          aria-label="編集"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(client)}
                          aria-label="削除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {client.contact_person && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span>{client.contact_person}</span>
                    </div>
                  )}
                  {client.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{client.contact_email}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t">
                    <span className="text-gray-500">
                      プロジェクト: {client.active_project_count || 0}/{client.project_count || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Client Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新規クライアント登録</DialogTitle>
            <DialogDescription>新しいクライアントの情報を入力してください</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="add-name">会社名 *</Label>
              <Input
                id="add-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={formErrors.name ? "border-red-500" : ""}
              />
              {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
            </div>
            <div>
              <Label htmlFor="add-industry">業界 *</Label>
              <Input
                id="add-industry"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className={formErrors.industry ? "border-red-500" : ""}
              />
              {formErrors.industry && <p className="text-red-500 text-sm mt-1">{formErrors.industry}</p>}
            </div>
            <div>
              <Label htmlFor="add-contact">担当者名</Label>
              <Input
                id="add-contact"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="add-email">メールアドレス</Label>
              <Input
                id="add-email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className={formErrors.contact_email ? "border-red-500" : ""}
              />
              {formErrors.contact_email && <p className="text-red-500 text-sm mt-1">{formErrors.contact_email}</p>}
            </div>
            <div>
              <Label htmlFor="add-phone">電話番号</Label>
              <Input
                id="add-phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="add-address">住所</Label>
              <Input
                id="add-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="add-website">ウェブサイト</Label>
              <Input
                id="add-website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="add-notes">メモ</Label>
              <Textarea
                id="add-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              キャンセル
            </Button>
            <Button onClick={handleAdd}>登録</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>クライアント編集</DialogTitle>
            <DialogDescription>クライアント情報を更新します</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">会社名 *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={formErrors.name ? "border-red-500" : ""}
              />
              {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
            </div>
            <div>
              <Label htmlFor="edit-industry">業界 *</Label>
              <Input
                id="edit-industry"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className={formErrors.industry ? "border-red-500" : ""}
              />
              {formErrors.industry && <p className="text-red-500 text-sm mt-1">{formErrors.industry}</p>}
            </div>
            <div>
              <Label htmlFor="edit-contact">担当者名</Label>
              <Input
                id="edit-contact"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-email">メールアドレス</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className={formErrors.contact_email ? "border-red-500" : ""}
              />
              {formErrors.contact_email && <p className="text-red-500 text-sm mt-1">{formErrors.contact_email}</p>}
            </div>
            <div>
              <Label htmlFor="edit-phone">電話番号</Label>
              <Input
                id="edit-phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-address">住所</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-website">ウェブサイト</Label>
              <Input
                id="edit-website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-notes">メモ</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              キャンセル
            </Button>
            <Button onClick={handleEdit}>更新</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedClient?.name}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4"
              onClick={() => setShowDetailModal(false)}
              aria-label="閉じる"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">業界</p>
                <p className="font-medium">{selectedClient.industry || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">担当者</p>
                <p className="font-medium">{selectedClient.contact_person || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">メールアドレス</p>
                <p className="font-medium">{selectedClient.contact_email || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">電話番号</p>
                <p className="font-medium">{selectedClient.contact_phone || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">住所</p>
                <p className="font-medium">{selectedClient.address || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">ウェブサイト</p>
                <p className="font-medium">{selectedClient.website || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">メモ</p>
                <p className="font-medium">{selectedClient.notes || "-"}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowDetailModal(false)}>閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}