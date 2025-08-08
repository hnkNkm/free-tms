import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/stores/authStore';
import { Save, ArrowLeft } from 'lucide-react';

interface EmployeeProfile {
  id: number;
  name: string;
  email: string;
  department?: string;
  position?: string;
  role: string;
  self_introduction?: string;
  career_goals?: string;
  specialties?: string;
  preferred_project_types?: string[];
  joined_date?: string;
}

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [projectTypes, setProjectTypes] = useState('');

  const isOwnProfile = currentUser?.id === Number(id);
  const canEdit = isOwnProfile || currentUser?.role === 'admin';

  useEffect(() => {
    if (id) {
      fetchEmployeeProfile();
    }
  }, [id]);

  const fetchEmployeeProfile = async () => {
    try {
      const response = await api.get(`/employees/${id}`);
      setProfile(response.data);
      setProjectTypes(response.data.preferred_project_types?.join(', ') || '');
    } catch (error) {
      console.error('Failed to fetch employee profile:', error);
      setError('プロフィールの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !canEdit) return;

    setSaving(true);
    setError('');

    try {
      const projectTypesArray = projectTypes
        .split(',')
        .map((type) => type.trim())
        .filter((type) => type);

      const updateData = {
        self_introduction: profile.self_introduction,
        career_goals: profile.career_goals,
        specialties: profile.specialties,
        preferred_project_types: projectTypesArray,
      };

      await api.put(`/employees/${id}/profile`, updateData);
      alert('プロフィールを更新しました');
    } catch (error) {
      console.error('Failed to update profile:', error);
      setError('プロフィールの更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center text-gray-500 py-8">
        プロフィールが見つかりません
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/employees')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          社員一覧に戻る
        </button>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {profile.name}のプロフィール
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information (Read-only) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                名前
              </label>
              <p className="mt-1 text-sm text-gray-900">{profile.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                メールアドレス
              </label>
              <p className="mt-1 text-sm text-gray-900">{profile.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                部署
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {profile.department || '-'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                役職
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {profile.position || '-'}
              </p>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-6">
            <div>
              <label
                htmlFor="self_introduction"
                className="block text-sm font-medium text-gray-700"
              >
                自己紹介
              </label>
              <textarea
                id="self_introduction"
                rows={4}
                disabled={!canEdit}
                value={profile.self_introduction || ''}
                onChange={(e) =>
                  setProfile({ ...profile, self_introduction: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100"
                placeholder="あなたの経験やスキル、興味のある分野について記述してください"
              />
            </div>

            <div>
              <label
                htmlFor="career_goals"
                className="block text-sm font-medium text-gray-700"
              >
                キャリア目標
              </label>
              <textarea
                id="career_goals"
                rows={3}
                disabled={!canEdit}
                value={profile.career_goals || ''}
                onChange={(e) =>
                  setProfile({ ...profile, career_goals: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100"
                placeholder="将来のキャリア目標や成長したい方向性について"
              />
            </div>

            <div>
              <label
                htmlFor="specialties"
                className="block text-sm font-medium text-gray-700"
              >
                専門分野・得意分野
              </label>
              <textarea
                id="specialties"
                rows={3}
                disabled={!canEdit}
                value={profile.specialties || ''}
                onChange={(e) =>
                  setProfile({ ...profile, specialties: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100"
                placeholder="特に得意とする技術や業務分野"
              />
            </div>

            <div>
              <label
                htmlFor="project_types"
                className="block text-sm font-medium text-gray-700"
              >
                参加したいプロジェクトタイプ
              </label>
              <input
                id="project_types"
                type="text"
                disabled={!canEdit}
                value={projectTypes}
                onChange={(e) => setProjectTypes(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100"
                placeholder="AI開発, Web開発, インフラ構築など（カンマ区切り）"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {canEdit && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}