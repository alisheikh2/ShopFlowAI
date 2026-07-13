/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { Ban, RefreshCw, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import AdminShell from '../components/AdminShell'
import { EmptyState, ErrorState } from '../components/LoadingState'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'

export default function AdminUsers() {
  const { user: currentUser } = useAuth()
  const { showToast } = useToast()

  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [bannedFilter, setBannedFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyUserId, setBusyUserId] = useState(null)
  const [userPendingBanAction, setUserPendingBanAction] = useState(null)

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      setError('')
      const response = await api.get('/users/admin/all', {
        query: {
          page,
          limit: 10,
          search: search || undefined,
          role: roleFilter || undefined,
          banned: bannedFilter || undefined,
        },
      })
      setUsers(response.data?.users || [])
      setPagination(response.data?.pagination || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [page, roleFilter, bannedFilter])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setPage(1)
    loadUsers()
  }

  const changeRole = async (userId, role) => {
    try {
      setBusyUserId(userId)
      await api.patch(`/users/admin/${userId}/role`, { role })
      showToast('Role updated', 'success')
      await loadUsers()
    } catch (err) {
      showToast(err.message || 'Could not update role', 'error')
    } finally {
      setBusyUserId(null)
    }
  }

  const toggleBan = (targetUser) => {
    setUserPendingBanAction(targetUser)
  }

  const confirmBanAction = async () => {
    if (!userPendingBanAction) return
    const targetUser = userPendingBanAction
    const nextBanned = !targetUser.isBanned

    try {
      setBusyUserId(targetUser._id)
      setUserPendingBanAction(null)
      await api.patch(`/users/admin/${targetUser._id}/ban`, { isBanned: nextBanned })
      showToast(nextBanned ? `${targetUser.name} has been banned` : `${targetUser.name} has been unbanned`, 'success')
      await loadUsers()
    } catch (err) {
      showToast(err.message || 'Could not update ban status', 'error')
    } finally {
      setBusyUserId(null)
    }
  }

  return (
    <AdminShell>
      <div className="admin-title-row">
        <div>
          <p className="eyebrow gradient-text">People</p>
          <h1 className="page-title">Users</h1>
          <p>Manage customer and admin accounts, roles, and access.</p>
        </div>
        <button className="btn ghost" onClick={loadUsers}><RefreshCw size={18} /> Refresh</button>
      </div>

      <form className="admin-filter-row" onSubmit={handleSearchSubmit}>
        <input
          type="search"
          placeholder="Search by name or email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1) }}>
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="customer">Customer</option>
        </select>
        <select value={bannedFilter} onChange={(event) => { setBannedFilter(event.target.value); setPage(1) }}>
          <option value="">All statuses</option>
          <option value="false">Active</option>
          <option value="true">Banned</option>
        </select>
        <button type="submit" className="btn primary">Search</button>
      </form>

      {isLoading && <div className="table-card order-table-skeleton skeleton" />}
      {!isLoading && error && <ErrorState title="Unable to load users" message={error} onRetry={loadUsers} />}
      {!isLoading && !error && users.length === 0 && (
        <EmptyState title="No users found" description="Try adjusting your search or filters." />
      )}
      {!isLoading && !error && users.length > 0 && (
        <div className="admin-table-card">
          <div className="admin-user-row admin-table-head">
            <span>User</span><span>Role</span><span>Status</span><span>Joined</span><span>Actions</span>
          </div>
          {users.map((user) => {
            const isSelf = user._id === currentUser?._id
            const isBusy = busyUserId === user._id
            return (
              <div className="admin-user-row" key={user._id}>
                <div>
                  <strong>{user.name}</strong>
                  <p>{user.email}</p>
                </div>
                <select
                  value={user.role}
                  disabled={isSelf || isBusy}
                  onChange={(event) => changeRole(user._id, event.target.value)}
                  title={isSelf ? 'You cannot change your own role' : undefined}
                >
                  <option value="customer">Customer</option>
                  <option value="admin">Admin</option>
                </select>
                <StatusBadge tone={user.isBanned ? 'orange' : 'green'}>
                  {user.isBanned ? 'Banned' : 'Active'}
                </StatusBadge>
                <p>{new Date(user.createdAt).toLocaleDateString('en-PK')}</p>
                <div className="row-actions">
                  <button
                    className={`icon-btn ${user.isBanned ? '' : 'danger'}`}
                    disabled={isSelf || isBusy}
                    title={isSelf ? 'You cannot ban your own account' : user.isBanned ? 'Unban user' : 'Ban user'}
                    onClick={() => toggleBan(user)}
                  >
                    {user.isBanned ? <ShieldCheck size={17} /> : <Ban size={17} />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="pagination-row">
          <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
          <div>
            <button className="btn ghost" disabled={!pagination.hasPrevPage} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button className="btn ghost" disabled={!pagination.hasNextPage} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}

      {userPendingBanAction && (
        <div className="logout-confirm-backdrop" onClick={() => setUserPendingBanAction(null)}>
          <div className="logout-confirm-card" role="dialog" aria-modal="true" aria-label="Confirm account status change" onClick={(event) => event.stopPropagation()}>
            <div className={`logout-confirm-icon ${userPendingBanAction.isBanned ? '' : 'danger'}`}>
              {userPendingBanAction.isBanned ? <ShieldCheck size={22} /> : <Ban size={22} />}
            </div>
            <h3>{userPendingBanAction.isBanned ? 'Unban this user?' : 'Ban this user?'}</h3>
            <p>
              {userPendingBanAction.isBanned
                ? <>Restore access for <strong>{userPendingBanAction.name}</strong>. They will be able to sign in and use their account again.</>
                : <>This will immediately sign <strong>{userPendingBanAction.name}</strong> out of every device and block them from signing in until unbanned.</>}
            </p>
            <div className="logout-confirm-actions">
              <button className="btn ghost" onClick={() => setUserPendingBanAction(null)}>Cancel</button>
              <button className="btn primary" onClick={confirmBanAction} disabled={busyUserId === userPendingBanAction._id}>
                {busyUserId === userPendingBanAction._id ? 'Please wait...' : userPendingBanAction.isBanned ? 'Yes, Unban User' : 'Yes, Ban User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
