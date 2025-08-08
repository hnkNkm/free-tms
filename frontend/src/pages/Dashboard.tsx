import { Users, Briefcase, TrendingUp, Clock } from 'lucide-react';

export default function Dashboard() {
  // TODO: 実際のデータはAPIから取得
  const stats = [
    { label: '社員数', value: '0', icon: Users, color: 'bg-blue-500' },
    { label: 'アクティブプロジェクト', value: '0', icon: Briefcase, color: 'bg-green-500' },
    { label: '今月の稼働率', value: '0%', icon: TrendingUp, color: 'bg-purple-500' },
    { label: '平均応答時間', value: '0日', icon: Clock, color: 'bg-yellow-500' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">ダッシュボード</h2>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${stat.color} rounded-md p-3`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.label}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activities */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            最近のアクティビティ
          </h3>
          <div className="text-sm text-gray-500 text-center py-8">
            データがありません
          </div>
        </div>
      </div>
    </div>
  );
}