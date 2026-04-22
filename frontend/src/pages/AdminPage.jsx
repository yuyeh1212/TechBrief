import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/context/AuthContext";
import {
  adminGetStats,
  adminListUsers,
  adminUpdateUserPlan,
  adminListArticles,
  adminDeleteArticle,
  adminTriggerNews,
  adminTriggerExpiry,
  adminTriggerWeeklyReport,
} from "@/api";
import styles from "./AdminPage.module.scss";

const PLAN_OPTIONS = ["free", "mini", "pro", "max"];

const PLAN_COLORS = {
  free: "#aaa",
  mini: "#4fc3f7",
  pro: "#00e5ff",
  max: "#f59e0b",
};

const TABS = [
  { key: "stats", label: "📊 統計" },
  { key: "users", label: "👥 用戶" },
  { key: "articles", label: "📰 文章" },
];

export default function AdminPage() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("stats");

  // ── 統計
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // ── 用戶
  const [users, setUsers] = useState([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [planFilter, setPlanFilter] = useState("");
  const [editingPlan, setEditingPlan] = useState({}); // { userId: newPlan }

  // ── 文章
  const [articles, setArticles] = useState([]);
  const [articleTotal, setArticleTotal] = useState(0);
  const [articlePage, setArticlePage] = useState(1);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");

  // ── 操作訊息
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/");
  }, [user, loading, isAdmin, navigate]);

  // ── 載入統計
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await adminGetStats();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── 載入用戶
  const loadUsers = useCallback(async (page = 1, plan = "") => {
    setUsersLoading(true);
    try {
      const params = { page, page_size: 20 };
      if (plan) params.plan = plan;
      const data = await adminListUsers(params);
      setUsers(data.items);
      setUserTotal(data.total);
      setUserPage(page);
    } catch (e) {
      console.error(e);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // ── 載入文章
  const loadArticles = useCallback(async (page = 1, category = "") => {
    setArticlesLoading(true);
    try {
      const params = { page, page_size: 20 };
      if (category) params.category = category;
      const data = await adminListArticles(params);
      setArticles(data.items);
      setArticleTotal(data.total);
      setArticlePage(page);
    } catch (e) {
      console.error(e);
    } finally {
      setArticlesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !isAdmin) return;
    if (activeTab === "stats") loadStats();
    if (activeTab === "users") loadUsers(1, planFilter);
    if (activeTab === "articles") loadArticles(1, categoryFilter);
  }, [activeTab, user, isAdmin]);

  const showMsg = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 3000);
  };

  // ── 修改用戶方案
  const handleUpdatePlan = async (userId, plan) => {
    try {
      await adminUpdateUserPlan(userId, plan);
      showMsg("✅ 方案已更新");
      loadUsers(userPage, planFilter);
    } catch (e) {
      showMsg("❌ 更新失敗：" + (e.response?.data?.detail || e.message));
    }
  };

  // ── 刪除文章
  const handleDeleteArticle = async (articleId, title) => {
    if (!window.confirm(`確定要刪除「${title}」？`)) return;
    try {
      await adminDeleteArticle(articleId);
      showMsg("✅ 文章已刪除");
      loadArticles(articlePage, categoryFilter);
    } catch (e) {
      showMsg("❌ 刪除失敗：" + (e.response?.data?.detail || e.message));
    }
  };

  // ── 手動觸發任務
  const handleTriggerNews = async () => {
    try {
      await adminTriggerNews();
      showMsg("✅ 新聞任務已啟動（在背景執行）");
    } catch (e) {
      showMsg("❌ 啟動失敗：" + (e.response?.data?.detail || e.message));
    }
  };

  const handleTriggerExpiry = async () => {
    try {
      await adminTriggerExpiry();
      showMsg("✅ 到期檢查任務已啟動");
    } catch (e) {
      showMsg("❌ 啟動失敗：" + (e.response?.data?.detail || e.message));
    }
  };

  const handleTriggerWeeklyReport = async () => {
    try {
      await adminTriggerWeeklyReport();
      showMsg("✅ 週報任務已啟動（約 30 秒後完成）");
    } catch (e) {
      showMsg("❌ 啟動失敗：" + (e.response?.data?.detail || e.message));
    }
  };

  if (loading || !user || !isAdmin) return null;

  return (
    <>
      <Helmet>
        <title>TechBrief | 管理後台</title>
      </Helmet>

      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>管理後台</h1>
              <p className={styles.subtitle}>TechBrief Admin Dashboard</p>
            </div>
            <Link to="/" className={styles.backBtn}>← 返回前台</Link>
          </div>

          {/* 操作回饋訊息 */}
          {actionMsg && (
            <div className={styles.actionMsg}>{actionMsg}</div>
          )}

          {/* Tab Bar */}
          <div className={styles.tabBar}>
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ""}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── 統計 ── */}
          {activeTab === "stats" && (
            <div className={styles.statsSection}>
              {statsLoading ? (
                <div className={styles.loading}>載入中…</div>
              ) : stats ? (
                <>
                  <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                      <span className={styles.statNum}>{stats.total_users}</span>
                      <span className={styles.statLabel}>總用戶</span>
                    </div>
                    <div className={styles.statCard}>
                      <span className={styles.statNum} style={{ color: "#00e5ff" }}>{stats.paid_users}</span>
                      <span className={styles.statLabel}>付費用戶</span>
                    </div>
                    <div className={styles.statCard}>
                      <span className={styles.statNum}>{stats.total_articles}</span>
                      <span className={styles.statLabel}>文章總數</span>
                    </div>
                    <div className={styles.statCard}>
                      <span className={styles.statNum} style={{ color: "#34d399" }}>{stats.today_articles}</span>
                      <span className={styles.statLabel}>今日新增</span>
                    </div>
                  </div>

                  <div className={styles.planBreakdown}>
                    <h3 className={styles.sectionTitle}>方案分佈</h3>
                    <div className={styles.planGrid}>
                      {Object.entries(stats.plan_counts || {}).map(([plan, count]) => (
                        <div key={plan} className={styles.planStatCard}>
                          <span className={styles.planBadge} style={{ color: PLAN_COLORS[plan], borderColor: PLAN_COLORS[plan] }}>
                            {plan.toUpperCase()}
                          </span>
                          <span className={styles.planCount}>{count} 人</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.quickActions}>
                    <h3 className={styles.sectionTitle}>快速操作</h3>
                    <div className={styles.actionBtns}>
                      <button className={styles.actionBtn} onClick={handleTriggerNews}>
                        🚀 手動觸發新聞任務
                      </button>
                      <button className={styles.actionBtn} onClick={handleTriggerExpiry}>
                        ⏰ 手動觸發到期檢查
                      </button>
                      <button className={styles.actionBtn} onClick={handleTriggerWeeklyReport}>
                        📈 手動觸發週報生成
                      </button>
                      <button className={styles.actionBtn} onClick={loadStats}>
                        🔄 重新整理統計
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className={styles.loading}>無法載入統計</div>
              )}
            </div>
          )}

          {/* ── 用戶管理 ── */}
          {activeTab === "users" && (
            <div className={styles.tableSection}>
              <div className={styles.tableControls}>
                <div className={styles.filterWrap}>
                  <select
                    className={styles.filterSelect}
                    value={planFilter}
                    onChange={(e) => {
                      setPlanFilter(e.target.value);
                      loadUsers(1, e.target.value);
                    }}
                  >
                    <option value="">全部方案</option>
                    {PLAN_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <span className={styles.totalCount}>共 {userTotal} 位用戶</span>
              </div>

              {usersLoading ? (
                <div className={styles.loading}>載入中…</div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>用戶</th>
                        <th>方案</th>
                        <th>到期日</th>
                        <th>加入日期</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className={u.is_admin ? styles.adminRow : ""}>
                          <td>
                            <div className={styles.userCell}>
                              <span className={styles.userName}>{u.name}</span>
                              <span className={styles.userEmail}>{u.email}</span>
                              {u.is_admin && <span className={styles.adminTag}>Admin</span>}
                            </div>
                          </td>
                          <td>
                            <span className={styles.planBadge} style={{ color: PLAN_COLORS[u.plan], borderColor: PLAN_COLORS[u.plan] }}>
                              {u.plan.toUpperCase()}
                            </span>
                          </td>
                          <td className={styles.dateCell}>
                            {u.plan_expires_at
                              ? new Date(u.plan_expires_at).toLocaleDateString("zh-TW")
                              : "—"}
                          </td>
                          <td className={styles.dateCell}>
                            {new Date(u.created_at).toLocaleDateString("zh-TW")}
                          </td>
                          <td>
                            {!u.is_admin && (
                              <div className={styles.planEditWrap}>
                                <select
                                  className={styles.planSelect}
                                  defaultValue={u.plan}
                                  onChange={(e) => setEditingPlan((prev) => ({ ...prev, [u.id]: e.target.value }))}
                                >
                                  {PLAN_OPTIONS.map((p) => (
                                    <option key={p} value={p}>{p}</option>
                                  ))}
                                </select>
                                <button
                                  className={styles.saveBtn}
                                  onClick={() => handleUpdatePlan(u.id, editingPlan[u.id] || u.plan)}
                                >
                                  更新
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 分頁 */}
              {userTotal > 20 && (
                <div className={styles.pagination}>
                  <button
                    className={styles.pageBtn}
                    disabled={userPage === 1}
                    onClick={() => loadUsers(userPage - 1, planFilter)}
                  >‹</button>
                  <span className={styles.pageInfo}>{userPage} / {Math.ceil(userTotal / 20)}</span>
                  <button
                    className={styles.pageBtn}
                    disabled={userPage >= Math.ceil(userTotal / 20)}
                    onClick={() => loadUsers(userPage + 1, planFilter)}
                  >›</button>
                </div>
              )}
            </div>
          )}

          {/* ── 文章管理 ── */}
          {activeTab === "articles" && (
            <div className={styles.tableSection}>
              <div className={styles.tableControls}>
                <div className={styles.filterWrap}>
                  <select
                    className={styles.filterSelect}
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value);
                      loadArticles(1, e.target.value);
                    }}
                  >
                    <option value="">全部分類</option>
                    {["ai", "gpt", "gemini", "claude", "tech", "collaboration", "finance"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <span className={styles.totalCount}>共 {articleTotal} 篇文章</span>
              </div>

              {articlesLoading ? (
                <div className={styles.loading}>載入中…</div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>標題</th>
                        <th>分類</th>
                        <th>來源</th>
                        <th>瀏覽</th>
                        <th>日期</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {articles.map((a) => (
                        <tr key={a.id}>
                          <td>
                            <Link
                              to={`/article/${a.slug}`}
                              className={styles.articleTitle}
                              target="_blank"
                            >
                              {a.title.length > 40 ? a.title.slice(0, 40) + "…" : a.title}
                            </Link>
                          </td>
                          <td>
                            <span className={styles.categoryTag}>{a.category}</span>
                          </td>
                          <td className={styles.sourceCell}>{a.source_name || "—"}</td>
                          <td className={styles.numCell}>{a.view_count}</td>
                          <td className={styles.dateCell}>
                            {new Date(a.created_at).toLocaleDateString("zh-TW")}
                          </td>
                          <td>
                            <button
                              className={styles.deleteBtn}
                              onClick={() => handleDeleteArticle(a.id, a.title)}
                            >
                              刪除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 分頁 */}
              {articleTotal > 20 && (
                <div className={styles.pagination}>
                  <button
                    className={styles.pageBtn}
                    disabled={articlePage === 1}
                    onClick={() => loadArticles(articlePage - 1, categoryFilter)}
                  >‹</button>
                  <span className={styles.pageInfo}>{articlePage} / {Math.ceil(articleTotal / 20)}</span>
                  <button
                    className={styles.pageBtn}
                    disabled={articlePage >= Math.ceil(articleTotal / 20)}
                    onClick={() => loadArticles(articlePage + 1, categoryFilter)}
                  >›</button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
